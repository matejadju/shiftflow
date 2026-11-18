# Pregled prevzetega projekta – ShiftFlow

Datum pregleda: 17. 11. 2026

Pregled je bil izveden na prevzetem projektu (fork `matejadju/shiftflow`).
Pregledani so bili dokumentacija (`docs/01`–`07`), arhitekturne odločitve
(`docs/adr/0001`–`0009`) in koda frontenda ter backenda. Aplikacija je bila
lokalno zagnana po navodilih iz `README.md` (PostgreSQL 17 v Dockerju,
migracije, seed, Express API in Vite frontend).

## Arhitektura in tehnologije

Trislojna spletna aplikacija:

- **Frontend:** React 19, TypeScript, Vite, React Router.
- **Backend:** Node.js, Express 5, REST API, validacija z Zod, JWT in bcrypt.
- **Podatkovna baza:** PostgreSQL s Prisma ORM in migracijami.

Arhitekturne odločitve so dokumentirane v devetih ADR-jih. Posebej sta
izpostavljeni zaščita pred prekrivanjem izmen in nerazpoložljivosti na ravni
baze ter atomarna potrditev menjave v eni transakciji (ADR 0009).

## Uspešno implementirane funkcionalnosti MVP

| Funkcionalnost | Stanje |
| --- | --- |
| Prijava z JWT, zaščitene strani glede na vlogo, odjava | Implementirano |
| Priprava osnutka, dodeljevanje in objava tedenskega urnika (vodja) | Implementirano |
| Koledarski pregled lastnih objavljenih izmen s preklopom tedna | Implementirano |
| Vnos, pregled in brisanje lastne nerazpoložljivosti | Implementirano |
| Oddaja zahteve za menjavo izmene s sodelavcem | Implementirano |
| Sprejem ali zavrnitev zahteve s strani prevzemnika | Implementirano |
| Odločitev vodje o menjavi s preverjanjem konfliktov in transakcijsko posodobitvijo | Implementirano |

Implementirane so vse MVP zgodbe US-01–US-07. Zgodbe US-08–US-13 so po
dokumentaciji načrtovane kot nadgradnje in niso del MVP.

### Avtomatizirano preverjanje ob pregledu

| Preverjanje | Rezultat |
| --- | --- |
| Backend testi (`npm test`, 7 datotek) | 62 uspešnih, 0 neuspešnih |
| Backend typecheck in build | Uspešno |
| Frontend lint (ESLint) | Uspešno, brez napak |
| Frontend build | Uspešno |

Poleg tega je bilo 32 sprejemnih pogojev za US-01–US-05 preverjenih neposredno
prek API-ja na zagnani aplikaciji. Vsi so bili uspešni.

## Ustreznost uporabniškim zgodbam

Pregledanih je bilo pet uporabniških zgodb US-01–US-05. Vsak sprejemni
kriterij je bil preverjen prek API-ja na lokalno zagnani aplikaciji, kriteriji,
vezani na uporabniški vmesnik, pa tudi s pregledom kode frontenda.

### US-01 – Prijava in dostop glede na vlogo

| Sprejemni kriterij | Ugotovitev | Ustreza |
| --- | --- | --- |
| Prijava z veljavnim e-poštnim naslovom in geslom | `POST /api/auth/login` vrne JWT za vse tri testne uporabnike | Da |
| Sporočilo ob napačnih podatkih | API vrne 401 »Napačen e-poštni naslov ali geslo.«, `LoginPage` ga prikaže | Da |
| Dostop samo do funkcionalnosti svoje vloge | Zaposleni na poti vodje dobi 403, vodja na poteh zaposlenega 403; `ProtectedRoute` z `allowedRoles` preusmeri na začetno stran | Da |
| Neprijavljen uporabnik nima dostopa do zaščitenih strani | API brez žetona vrne 401; frontend preusmeri na `/login` | Da |

### US-02 – Priprava, dodeljevanje in objava tedenskega urnika

| Sprejemni kriterij | Ugotovitev | Ustreza |
| --- | --- | --- |
| Ustvarjanje izmene z datumom, uro in zaposlenim | `POST /api/shifts` ustvari izmeno s statusom `DRAFT` | Da |
| Zavrnitev, če je konec enak ali pred začetkom | Oba primera vrneta 400 (validacija Zod) | Da |
| Shranjevanje osnutka in poznejša objava | Gumba »Shrani osnutek« in »Objavi urnik«; objava spremeni status celega tedna | Da |
| Zaposleni vidijo samo objavljene izmene | Pred objavo je seznam zaposlenega prazen, po objavi vsebuje izmeno | Da |

### US-03 – Koledarski pregled delovnih izmen

| Sprejemni kriterij | Ugotovitev | Ustreza |
| --- | --- | --- |
| Prikaz datuma ter začetne in končne ure | API vrne `date`, `startTime`, `endTime`; koledar jih prikaže | Da |
| Preklapljanje med tedni | Gumbi »Prejšnji teden«, »Naslednji teden« in izbira tedna | Da |
| Samo lastne izmene | Drug zaposleni tuje izmene ne vidi | Da |
| Sporočilo za teden brez izmen | »Za izbrani teden nimate objavljenih izmen.« | Da |

### US-04 – Označevanje nerazpoložljivosti

| Sprejemni kriterij | Ugotovitev | Ustreza |
| --- | --- | --- |
| Vnos datuma ter začetne in končne ure | `POST /api/me/unavailability` vrne 201 | Da |
| Zavrnitev neveljavnega intervala | Konec pred začetkom vrne 400 | Da |
| Pregled in odstranitev lastnih vnosov | Seznam vsebuje samo lastne vnose; brisanje lastnega vrne 204, tujega 404 | Da |
| Preverjanje nerazpoložljivosti pri potrditvi menjave | Potrditev menjave na prevzemnika, ki je nerazpoložljiv, vrne 409 »Prevzemnik je v izbranem času nerazpoložljiv.« | Da |

Dodatno sistem zavrne prekrivajoče vnose istega zaposlenega (409), zaščita
pa velja tudi na ravni baze.

### US-05 – Oddaja zahteve za menjavo izmene

| Sprejemni kriterij | Ugotovitev | Ustreza |
| --- | --- | --- |
| Izbira samo lastne objavljene izmene | Tuja izmena vrne 404, neobjavljena 400 | Da |
| Izbira drugega zaposlenega kot prevzemnika | Seznam sodelavcev ne vsebuje uporabnika samega in vodje; izbira sebe vrne 400 | Da |
| Status »v čakanju« in vidnost izbranemu sodelavcu | Zahteva dobi `PENDING` in je vidna prevzemniku | Da |
| Preprečevanje druge odprte zahteve za isto izmeno | Druga zahteva vrne 409; v koledarju je gumb onemogočen | Da |

### Povzetek

Implementirane funkcionalnosti v celoti zadoščajo vsem pregledanim
sprejemnim kriterijem zgodb US-01–US-05. Rezultati se ujemajo z ugotovitvami
prejšnje ekipe v `07-preverjanje-mvp.md`.

## Opažanja za nadaljnje delo

- **CI/CD:** projekt nima avtomatiziranega cevovoda; preverjanja so se izvajala ročno.
- **Lint:** ESLint je nastavljen samo za frontend, backend linterja nima.
- **Testi:** backend ima 62 integracijskih testov, ki potrebujejo PostgreSQL;
  frontend nima testov, poročila o pokritosti kode ni.
- **Namestitev:** frontend kliče API z relativnimi potmi (`/api/...`), ki med
  razvojem delujejo prek Vite proxyja. Za produkcijsko namestitev mora biti URL
  backenda nastavljiv prek okoljske spremenljivke.
- **Lokalni zagon:** vrata 5432, 3000 in 5173 so fiksna (`strictPort`), zato
  zagon ni mogoč, če jih uporablja drug projekt.
