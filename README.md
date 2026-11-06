# ShiftFlow

Spletna aplikacija za organizacijo delovnih izmen v manjših podjetjih.

## Funkcionalnosti

- Prijava z JWT, preverjanje vlog, zaščitene strani in odjava.
- Priprava, dodeljevanje in objava tedenskega urnika za vodjo.
- Koledarski pregled lastnih objavljenih izmen zaposlenega.
- API za dodajanje, pregled in brisanje lastne nerazpoložljivosti.
- Obrazec, pregled in brisanje lastne nerazpoložljivosti.
- Preprečevanje podvojenih in prekrivajočih obdobij nerazpoložljivosti.
- API za oddajo zahtev za menjavo, izbor sodelavca in pregled lastnih zahtev.
- Predlog menjave iz osebnega koledarja z izbiro sodelavca in prikazom odprte zahteve.
- API za sprejem ali zavrnitev zahteve s strani izbranega prevzemnika.
- Pregled prejetih zahtev ter sprejem ali zavrnitev predloga menjave.
- API za odločitev vodje o sprejeti menjavi s preverjanjem konfliktov in transakcijsko posodobitvijo urnika.
- Pregled sprejetih zahtev ter potrditev ali zavrnitev menjave v vmesniku vodje.

## Tehnologije

React, TypeScript, Vite, Express, PostgreSQL, Prisma, JWT, bcrypt in Zod.

- `frontend/` – uporabniški vmesnik.
- `backend/` – REST API, poslovna logika in migracije.
- `docs/` – projektna dokumentacija.

## Lokalni zagon

Potrebujemo Node.js 24, npm, Git in zagnan Docker Desktop.
Spodnji ukazi so za Windows PowerShell.

### 1. Konfiguracija

Ob prvi pripravi iz glavne mape kopiramo predlogi:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
```

V glavni `.env` nastavimo:

```dotenv
POSTGRES_PASSWORD=YOUR_DATABASE_PASSWORD
```

V `backend/.env` nastavimo:

```dotenv
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://shiftflow:YOUR_DATABASE_PASSWORD@localhost:5432/shiftflow?schema=public
SEED_PASSWORD=YOUR_LOCAL_TEST_PASSWORD
JWT_SECRET=YOUR_GENERATED_SECRET
```

Geslo v `DATABASE_URL` mora ustrezati geslu PostgreSQL.
Posebne znake v povezovalnem URL-ju URL-kodiramo.
`SEED_PASSWORD` mora imeti najmanj 12 znakov.

Naključen ključ za `JWT_SECRET` ustvarimo z ukazom:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Datotek `.env` in skrivnosti ne vključujemo v Git.
Obstoječih konfiguracij ob ponovnem zagonu ne prepisujemo.

### 2. Baza in backend

Iz glavne mape:

```powershell
docker compose up -d
docker compose ps
```

Ko baza doseže stanje `healthy`, nadaljujemo:

```powershell
cd backend
npm.cmd ci
npm.cmd exec -- prisma generate
npm.cmd exec -- prisma migrate deploy
npm.cmd exec -- prisma db seed
npm.cmd run dev
```

API deluje na `http://localhost:3000`.
Endpoint `/api/health` preverja dosegljivost API-ja.

Migracije in seed pripravijo tudi prazno bazo.
Generirani Prisma klient ni v Git, zato ga ustvarimo z `prisma generate`.

### 3. Frontend

V drugem terminalu iz glavne mape:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Aplikacijo odpremo na `http://localhost:5173`.

## Uporaba

| Testni uporabnik | Vloga |
| --- | --- |
| maja.vodja@example.com | Vodja |
| ana.novak@example.com | Zaposleni |
| luka.kovac@example.com | Zaposleni |

Novi uporabniki dobijo geslo iz `SEED_PASSWORD`, shranjeno z bcrypt.
Ponovljen seed ne podvoji uporabnikov in ne spremeni obstoječih gesel.

Osvežitev iste kartice ohrani prijavo. Po odjavi ali poteku žetona
je potrebna ponovna prijava.

Vodja izbere »Pregled za vodjo«, določi teden, doda osnutke izmen
in jih objavi. Konec izmene mora biti po začetku.

Zaposleni izbere »Moje izmene«. Koledar prikazuje samo njegove
objavljene izmene ter omogoča preklapljanje med tedni.
Za prazen teden se prikaže obvestilo.

Zaposleni prek »Moja nerazpoložljivost« vnese datum in časovni interval,
pregleda svoje vnose ter jih odstrani s potrditvijo.
Konec mora biti po začetku. Prekrivajoči vnosi istega zaposlenega
so zavrnjeni z odgovorom 409; stični intervali so dovoljeni.
Zaščita velja tudi ob sočasnih zahtevah.

Zaposleni v koledarju izbere »Predlagaj menjavo«, določi sodelavca
in pošlje zahtevo. Pri izmeni se prikaže status »V čakanju«.
Dokler je zahteva odprta, nova oddaja za isto izmeno ni na voljo.
Oddaja zahteve še ne spremeni urnika.

Zaposleni prek »Prejete zahteve« pregleda predloge sodelavcev.
Na čakajočo zahtevo odgovori z »Sprejmi« ali »Zavrni«.
Sprejeta zahteva čaka na vodjo; odgovor še ne spremeni urnika.

Vodja prek »Potrditev menjav« pregleda sprejete zahteve.
Potrditev preveri konflikte in posodobi dodelitev izmene.
Ob konfliktu se prikaže razlog, zavrnitev pa ohrani obstoječi urnik.
Po uspešni odločitvi zahteva izgine s seznama za odločanje.

## API

Zaščitene poti zahtevajo glavo `Authorization: Bearer <žeton>`.

| Metoda in pot | Dostop | Namen |
| --- | --- | --- |
| `GET /api/health` | Javno | Dosegljivost API-ja |
| `POST /api/auth/login` | Javno | Prijava |
| `GET /api/auth/me` | Prijavljen uporabnik | Podatki uporabnika |
| `GET /api/shifts/employees` | Vodja | Seznam zaposlenih |
| `POST /api/shifts` | Vodja | Ustvarjanje osnutka |
| `GET /api/shifts?weekStart=2030-02-04` | Vodja | Tedenski urnik |
| `POST /api/shifts/publish` | Vodja | Objava tedna |
| `GET /api/me/shifts?weekStart=2030-02-04` | Zaposleni | Lastne objavljene izmene |
| `GET /api/me/unavailability` | Zaposleni | Lastna nerazpoložljivost |
| `POST /api/me/unavailability` | Zaposleni | Dodajanje nerazpoložljivosti |
| `DELETE /api/me/unavailability/:id` | Zaposleni | Brisanje lastnega vnosa |
| `GET /api/swap-requests/recipients` | Zaposleni | Izbor sodelavca |
| `POST /api/swap-requests` | Zaposleni | Oddaja zahteve za menjavo |
| `GET /api/swap-requests` | Zaposleni | Poslane in prejete zahteve |
| `PATCH /api/swap-requests/:id/respond` | Izbrani prevzemnik | Sprejem ali zavrnitev zahteve |

Datumi imajo obliko `YYYY-MM-DD`, ure pa `HH:mm`.
`weekStart` mora biti ponedeljek.

- Prijava sprejme `email` in `password`.
- Ustvarjanje izmene sprejme `employeeId`, `date`, `startTime` in `endTime`.
- Objava sprejme `weekStart`.
- Nerazpoložljivost sprejme `date`, `startTime` in `endTime`.
- Osebne poti določijo zaposlenega iz prijave.
- Oddaja zahteve sprejme `shiftId` in `recipientId`. Zaposleni lahko predlaga samo svojo objavljeno izmeno drugemu zaposlenemu.
- Nova zahteva dobi status `PENDING`; urnik ostane nespremenjen.
- Za isto izmeno je dovoljena največ ena odprta zahteva (`PENDING` ali `ACCEPTED`), sicer API vrne 409.
- Zahtevo vidita samo predlagatelj in prevzemnik.
- Odgovor na zahtevo sprejme `decision` z vrednostjo `ACCEPT` ali `REJECT`.
- Odgovori lahko samo izbrani prevzemnik in samo na zahtevo v stanju
- `PENDING`. Sprejem nastavi `ACCEPTED`, zavrnitev pa `REJECTED`.
- Urnik v obeh primerih ostane nespremenjen; sprejeta zahteva čaka na vodjo.
- Ponoven ali sočasen drugi odgovor je zavrnjen z odgovorom 409.
- Odločitev vodje sprejme `decision`: `APPROVE` ali `REJECT`.
- Odločanje je dovoljeno samo za status `ACCEPTED`.
- Pred potrditvijo sistem preveri lastništvo in objavljenost izmene, vlogo prevzemnika, prekrivanje z njegovimi izmenami in nerazpoložljivost.
Konflikt vrne 409 z razlogom, brez spremembe zahteve ali urnika.
Uspešna potrditev v eni transakciji spremeni zaposlenega na izmeni in status zahteve v `APPROVED`. Zavrnitev nastavi `REJECTED`, urnik pa ostane nespremenjen.

## Preverjanje

Iz glavne mape:

```powershell
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
```

Za API teste enkrat ustvarimo ločeno bazo:

```powershell
docker compose exec database psql -U shiftflow -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE shiftflow_api_test;"
```

Če baza že obstaja, tega koraka ne ponavljamo. Teste zaženemo:

```powershell
npm.cmd --prefix backend run test
```

Skripta uporabi konfiguracijo iz `backend/.env`, pripravi migracije
in seed v `shiftflow_api_test` ter izvede teste.
Razvojne baze `shiftflow` ne spreminja.
HTTP strežnika ni treba posebej zagnati.

## Zaustavitev

Frontend in backend ustavimo s `Ctrl+C`.
Iz glavne mape ustavimo bazo:

```powershell
docker compose down
```

Podatki ostanejo v Docker volume-u. Sprememba gesla v `.env`
ne spremeni gesla že inicializirane baze.

## Razvojni proces

Za vsako nalogo uporabljamo ločeno vejo in GitHub Issue.
Spremembe vključujemo v `main` prek PR z opisom, preverjanjem
in povezavo `Closes #<številka>`.

Napredek spremljamo v GitHub Projects: To Do → Doing → Done.

## Dokumentacija

- [Zasnova rešitve](docs/01-zasnova-resitve.md)
- [Funkcionalnosti in obseg](docs/02-funkcionalnosti-in-obseg.md)
- [Podatkovni model](docs/03-podatkovni-model.md)
- [Arhitektura in tehnologije](docs/04-arhitektura-in-tehnoloski-sklad.md)
- [Uporabniške zgodbe](docs/05-uporabniske-zgodbe.md)
- [Wireframe-i](docs/06-wireframes.md)
- [Arhitekturne odločitve](docs/adr/README.md)