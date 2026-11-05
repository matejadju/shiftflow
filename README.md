# ShiftFlow

Spletna aplikacija za organizacijo delovnih izmen v manjših podjetjih.

## Trenutno stanje

Implementirano:
- Prijava z JWT, uporabniške vloge, zaščitene strani in odjava.
- Priprava, dodeljevanje in objava tedenskega urnika za vodjo.
- API za pregled lastnih objavljenih izmen zaposlenega.
- Podatkovni modeli, migracije in začetni uporabniki.

Koledarski vmesnik zaposlenega, nerazpoložljivost in menjave izmen
sledijo v naslednjih nalogah.

## Tehnologije

React, TypeScript, Vite, Express, PostgreSQL, Prisma, JWT, bcrypt in Zod.

Projekt sestavljajo `frontend/`, `backend/` in dokumentacija v `docs/`.

## Lokalni zagon

Potrebujemo Node.js 24, npm, Git in zagnan Docker Desktop.
Spodnji ukazi so za Windows PowerShell.

### 1. Konfiguracija

Iz glavne mape ob prvi pripravi kopiramo predlogi:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
```

V glavni `.env` nastavimo `POSTGRES_PASSWORD`.

V `backend/.env` nastavimo:

```dotenv
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://shiftflow:YOUR_PASSWORD@localhost:5432/shiftflow?schema=public
SEED_PASSWORD=YOUR_LOCAL_TEST_PASSWORD
JWT_SECRET=YOUR_GENERATED_SECRET
```

- `YOUR_PASSWORD`: geslo PostgreSQL iz glavne `.env`; posebne znake URL-kodiramo.
- `SEED_PASSWORD`: lokalno testno geslo z najmanj 12 znaki.
- `JWT_SECRET`: naključen ključ, ki ga ustvarimo z ukazom:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Datotek `.env` in skrivnosti ne vključujemo v Git.

### 2. Baza in backend

Iz glavne mape:

```powershell
docker compose up -d
docker compose ps
cd backend
npm.cmd ci
npm.cmd exec -- prisma generate
npm.cmd exec -- prisma migrate deploy
npm.cmd exec -- prisma db seed
npm.cmd run dev
```

Baza mora doseči stanje `healthy`. API deluje na
`http://localhost:3000`, preverjanje dosegljivosti pa na `/api/health`.

Migracije in seed pripravijo tudi prazno bazo. Generirani Prisma
klient ni v Git, zato je potreben korak `prisma generate`.

### 3. Frontend

V drugem terminalu iz glavne mape:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Aplikacijo odpremo na `http://localhost:5173`.

## Testni uporabniki

| E-pošta | Vloga |
| --- | --- |
| maja.vodja@example.com | Vodja |
| ana.novak@example.com | Zaposleni |
| luka.kovac@example.com | Zaposleni |

Novi uporabniki dobijo geslo iz `SEED_PASSWORD`, shranjeno z bcrypt.
Ponovljen seed ne podvoji uporabnikov in ne spreminja obstoječih gesel.

Vodja prek »Pregled za vodjo« izbere teden, doda osnutke izmen in
objavi urnik. Konec izmene mora biti po začetku.

Prijava se ohrani ob osvežitvi iste kartice. Ob odjavi ali poteku
žetona je potrebna ponovna prijava.

## API

Zaščitene poti zahtevajo glavo `Authorization: Bearer <žeton>`.

| Metoda in pot | Dostop | Namen |
| --- | --- | --- |
| `GET /api/health` | Javno | Dosegljivost API-ja |
| `POST /api/auth/login` | Javno | Prijava z emailom in geslom |
| `GET /api/auth/me` | Prijavljen uporabnik | Podatki uporabnika |
| `GET /api/shifts/employees` | Vodja | Seznam zaposlenih |
| `POST /api/shifts` | Vodja | Ustvarjanje osnutka |
| `GET /api/shifts?weekStart=2030-02-04` | Vodja | Tedenski urnik |
| `POST /api/shifts/publish` | Vodja | Objava tedna |
| `GET /api/me/shifts?weekStart=2030-02-04` | Zaposleni | Lastne objavljene izmene |

Datumi so v obliki `YYYY-MM-DD`, ure pa `HH:mm`.
`weekStart` mora biti ponedeljek. Objava sprejme telo `{ "weekStart": "2030-02-04" }`.

Ustvarjanje izmene zahteva `employeeId`, `date`, `startTime` in `endTime`.
Osebni urnik določi zaposlenega iz prijave, skriva osnutke in tuje
izmene ter za prazen teden vrne `shifts: []`.

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

Nato teste zaženemo:

```powershell
npm.cmd --prefix backend run test
```

Skripta pripravi migracije in seed v `shiftflow_api_test` ter izvede
teste prijave, pravic in urnikov. Uporablja konfiguracijo iz
`backend/.env`; razvojne baze `shiftflow` ne spreminja.
HTTP strežnika ni treba posebej zagnati.

## Zaustavitev

Frontend in backend ustavimo s `Ctrl+C`. Iz glavne mape ustavimo bazo:

```powershell
docker compose down
```

Podatki ostanejo v Docker volume-u. Sprememba `POSTGRES_PASSWORD`
v `.env` ne spremeni gesla že inicializirane baze.

## Razvojni proces

Vsaka naloga ima svojo razvojno vejo in GitHub Issue.
Spremembe vključujemo v `main` prek PR z opisom, preverjanjem in
povezavo `Closes #<številka>`. Napredek spremljamo na GitHub Projects
v stolpcih To Do, Doing in Done.

## Dokumentacija

- [Zasnova rešitve](docs/01-zasnova-resitve.md)
- [Funkcionalnosti in obseg](docs/02-funkcionalnosti-in-obseg.md)
- [Podatkovni model](docs/03-podatkovni-model.md)
- [Arhitektura in tehnologije](docs/04-arhitektura-in-tehnoloski-sklad.md)
- [Uporabniške zgodbe](docs/05-uporabniske-zgodbe.md)
- [Wireframe-i](docs/06-wireframes.md)
- [Arhitekturne odločitve](docs/adr/README.md)