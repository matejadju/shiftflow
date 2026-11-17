# Pregled projekta - Shiftflow

Datum pregleda: 17.11.2026

Pregledal: Gašper Topolinjak

Pregled zajema vse združene PR-je (#20–#38) na veji `main`
(zadnji commit `be57b84`). Pregledana sta izvorna koda backenda in
frontenda, migracije baze in avtomatizirani testi. Aplikacija je bila
lokalno zagnana po navodilih iz [README](../README.md); prijava vseh
treh testnih uporabnikov in zavrnitev napačnega gesla delujeta.
Avtomatiziranih testov v tem pregledu nismo ponovno zagnali.

## Pregled uspešno implementiranih funkcionalnosti za MVP

| Funkcionalnost | PR | Backend | Frontend | Stanje |
| --- | --- | --- | --- | --- |
| Prijava in dostop glede na vlogo | #22, #23 | `POST /api/auth/login`, `GET /api/auth/me`, JWT in bcrypt, `requireRole` | Prijavni obrazec, `ProtectedRoute` | Implementirano |
| Priprava, dodeljevanje in objava tedenskega urnika | #24, #25 | `POST /api/shifts`, `GET /api/shifts`, `POST /api/shifts/publish` | Pregled za vodjo | Implementirano |
| Koledarski pregled delovnih izmen | #26, #27 | `GET /api/me/shifts` | Moje izmene | Implementirano |
| Označevanje nerazpoložljivosti | #28, #29, #31 | `GET`, `POST`, `DELETE /api/me/unavailability` | Moja nerazpoložljivost | Implementirano |
| Oddaja zahteve za menjavo izmene | #32, #33 | `POST /api/swap-requests`, `GET /api/swap-requests/recipients` | Predlog menjave v koledarju | Implementirano, z napako (glej US-05) |
| Sprejem ali zavrnitev menjave s strani sodelavca | #34, #35 | `PATCH /api/swap-requests/:id/respond` | Prejete zahteve | Implementirano |
| Potrditev menjave, preverjanje in posodobitev urnika | #36, #37 | `GET /api/manager/swap-requests`, `PATCH /api/manager/swap-requests/:id/decision` | Potrditev menjav | Implementirano |

Dodatno so implementirane zaščite na ravni baze:

- Omejitev `EXCLUDE` prepreči prekrivajoče izmene istega zaposlenega.
- Omejitev `EXCLUDE` prepreči prekrivajoče vnose nerazpoložljivosti.
- Potrditev menjave poteka v eni transakciji z izolacijo `Serializable`
  in ponovnimi poskusi (skladno z ADR-0009).

Funkcionalnosti 8–13 (US-08 do US-13) niso implementirane, kar je
skladno z načrtovanim obsegom MVP.

## Zadoščanje implementiranih funkcionalnosti uporabniškim zgodbam

| Zgodba | Sprejemni kriteriji | Ocena |
| --- | --- | --- |
| US-01 Prijava in dostop glede na vlogo | Vsi izpolnjeni | Zadošča |
| US-02 Priprava in objava urnika | Vsi izpolnjeni | Zadošča |
| US-03 Koledarski pregled izmen | Vsi izpolnjeni | Zadošča |
| US-04 Označevanje nerazpoložljivosti | Vsi izpolnjeni | Zadošča |
| US-05 Oddaja zahteve za menjavo | Trije od štirih v celoti; četrti ne velja ob sočasnih zahtevah | Delno zadošča |
| US-06 Sprejem ali zavrnitev menjave | Vsi izpolnjeni | Zadošča |
| US-07 Potrditev menjave s strani vodje | Vsi izpolnjeni | Zadošča |

### US-01 – Prijava in dostop glede na vlogo

- Prijava z e-pošto in geslom; napačni podatki vrnejo 401 s sporočilom
  »Napačen e-poštni naslov ali geslo.«
- Dostop glede na vlogo se preverja na strežniku (`requireRole`, odgovor
  403) in v vmesniku (`ProtectedRoute`).
- Neprijavljen uporabnik je preusmerjen na prijavo.

### US-02 – Priprava, dodeljevanje in objava tedenskega urnika

- Vodja ustvari izmeno z datumom, začetkom, koncem in zaposlenim.
- Izmena, pri kateri konec ni po začetku, je zavrnjena (validacija Zod
  in obrazec).
- Nove izmene so osnutki (`DRAFT`); objava nastavi vse osnutke tedna na
  `PUBLISHED`.
- Zaposleni prejme samo objavljene izmene.

### US-03 – Koledarski pregled delovnih izmen

- Prikazani so datum ter začetna in končna ura vsake objavljene izmene.
- Preklop na prejšnji in naslednji teden deluje.
- Zaposleni vidi samo svoje izmene (`employeeId` iz prijave).
- Za prazen teden se prikaže »Za izbrani teden nimate objavljenih izmen.«

### US-04 – Označevanje nerazpoložljivosti

- Vnos datuma ter začetne in končne ure; neveljaven interval je zavrnjen.
- Zaposleni pregleda in odstrani samo svoje vnose.
- Pri potrditvi menjave sistem preveri nerazpoložljivost prevzemnika.

### US-05 – Oddaja zahteve za menjavo izmene

- Izbrati je mogoče samo lastno objavljeno izmeno; tuja izmena vrne 404.
- Prevzemnik mora biti drug zaposleni.
- Nova zahteva ima status `PENDING` in je vidna prevzemniku.
- **Napaka:** preprečevanje druge odprte zahteve za isto izmeno deluje le
  zaporedno. Koda v
  [swap-requests.ts](../backend/src/routes/swap-requests.ts) se v
  komentarju sklicuje na enolični indeks, ki naj bi preprečil dve odprti
  zahtevi ob sočasni oddaji, vendar ta indeks v
  [migracijah](../backend/prisma/migrations/) ne obstaja. Ob dveh
  sočasnih zahtevah lahko obe uspeta. Test »Sočasna oddaja ustvari samo
  eno odprto zahtevo« zato ni zanesljiv, trditev v
  [07-preverjanje-mvp.md](07-preverjanje-mvp.md) pa za sočasni primer ne
  drži.

Predlagan popravek je nova migracija z delnim enoličnim indeksom:

```sql
CREATE UNIQUE INDEX "SwapRequest_one_open_per_shift"
  ON "SwapRequest" ("shiftId")
  WHERE status IN ('PENDING', 'ACCEPTED');
```

### US-06 – Sprejem ali zavrnitev menjave s strani sodelavca

- Prevzemnik vidi zahteve, pri katerih je izbran.
- Odgovor je mogoč samo na zahtevo `PENDING`; ob sočasnih odgovorih uspe
  le prvi.
- Sprejem nastavi `ACCEPTED`, zavrnitev `REJECTED`; urnik ostane
  nespremenjen.

### US-07 – Potrditev menjave, preverjanje in posodobitev urnika

- Vodja odloča samo o zahtevah `ACCEPTED`.
- Pred potrditvijo se preverita prekrivanje z izmenami prevzemnika in
  njegova nerazpoložljivost; ob konfliktu se vrne 409 z razlogom.
- Uspešna potrditev v eni transakciji spremeni zaposlenega na izmeni in
  status zahteve v `APPROVED`; zavrnitev ohrani urnik.

### Manjše vrzeli

Naslednje točke ne kršijo sprejemnih kriterijev, so pa smiselne
izboljšave:

- **US-02:** vodja izmene ne more urediti ali izbrisati, zato napačno
  vnesen osnutek ostane v urniku.
- **US-04:** zgodba navaja, da se nerazpoložljivost upošteva pri
  razporejanju, vendar se pri ustvarjanju izmene ne preverja; preverja se
  le pri potrditvi menjave.
- **US-05:** menjavo je mogoče predlagati tudi za izmeno, ki je že minila.
- Izmene čez polnoč niso podprte, ker mora biti konec na isti dan po
  začetku.
- Vloga `ADMIN` obstaja v podatkovnem modelu, a nima funkcionalnosti
  (izven obsega MVP).

## Zaključek

Implementirane funkcionalnosti po obsegu ustrezajo MVP zgodbam
US-01–US-07. Šest zgodb v celoti izpolnjuje sprejemne kriterije, US-05 pa
delno zaradi manjkajočega enoličnega indeksa za odprte zahteve. Pred
zaključkom MVP predlagamo dodajanje te migracije in ponovni zagon testov.
