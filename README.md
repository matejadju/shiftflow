# ShiftFlow

ShiftFlow je načrtovana spletna aplikacija za organizacijo delovnih izmen v manjših podjetjih, predvsem v gostinstvu. Vodja lahko pripravlja tedenske urnike, zaposleni pregledajo svoje izmene in razpoložljivost ter predlagajo menjave. Menjavo najprej sprejme sodelavec, nato jo potrdi vodja; sistem mora preprečiti časovno prekrivanje izmen.

## Tehnološki sklad

| Del | Predvidene tehnologije |
| --- | --- |
| Frontend | React, TypeScript, CSS |
| Backend in API | Node.js, Express, TypeScript, REST/JSON |
| Podatkovna baza | PostgreSQL |
| Dostop do baze | Prisma ORM |
| Avtentikacija | JWT, bcrypt in preverjanje uporabniških vlog |
| Validacija | Zod |
| Lokalno okolje | npm, Docker Compose (za PostgreSQL) |
| Razvojni proces | Git, GitHub Flow, pull requesti |

## Dokumentacija

- [Zasnova rešitve](docs/01-zasnova-resitve.md)
- [Funkcionalnosti in obseg](docs/02-funkcionalnosti-in-obseg.md)
- [Podatkovni model](docs/03-podatkovni-model.md)
- [Arhitektura in tehnološki sklad](docs/04-arhitektura-in-tehnoloski-sklad.md)
- [Uporabniške zgodbe](docs/05-uporabniske-zgodbe.md)
- [Wireframe-i](docs/06-wireframes.md)
- [Arhitekturne odločitve (ADR)](docs/adr/README.md)

## Struktura projekta

- `frontend/` – predviden uporabniški vmesnik.
- `backend/` – predviden REST API in poslovna logika.
- `docs/` – specifikacija projekta, skice zaslonov in ADR-ji.

## Trenutno stanje

Pripravljeno je začetno razvojno okolje:
- React in TypeScript frontend.
- Express in TypeScript backend z endpointom `/api/health`.
- PostgreSQL v Docker Compose.

Prijava, podatkovni modeli in upravljanje izmen še niso implementirani.
Health endpoint trenutno preverja dosegljivost API-ja, ne povezave z bazo.

## Lokalni zagon

### Predpogoji

- Node.js 24 in npm.
- Docker Desktop z Docker Compose.
- Git.

Ukaze izvajamo iz glavne mape repozitorija, razen kjer je navedeno drugače.
V Windows PowerShell uporabljamo `npm.cmd`.

### 1. Okoljske spremenljivke

V glavni mapi kopiramo primer konfiguracije:

`Copy-Item .env.example .env`

V ustvarjeni datoteki `.env` nastavimo `POSTGRES_PASSWORD` za lokalno bazo.

Pripravimo tudi konfiguracijo backenda:

`Copy-Item backend/.env.example backend/.env`

Datotek `.env` ne vključujemo v Git. Datoteke `.env.example` vsebujejo
predlogo konfiguracije.

### 2. Podatkovna baza

Zaženemo Docker Desktop in izvedemo:

`docker compose up -d`

Stanje preverimo z:

`docker compose ps`

Storitev `database` mora imeti stanje `healthy`. Baza `shiftflow` je
dosegljiva na `localhost:5432` z uporabnikom `shiftflow` in geslom iz `.env`.

Podatki se hranijo v Docker volume-u. Sprememba gesla v `.env` ne spremeni
gesla v že inicializirani bazi.

### 3. Backend

V ločenem terminalu:

`cd backend`

`npm.cmd ci`

`npm.cmd run dev`

API je dosegljiv na `http://localhost:3000`.
Endpoint `http://localhost:3000/api/health` vrne:

`{"status":"ok","service":"shiftflow-api"}`

### 4. Frontend

V drugem terminalu:

`cd frontend`

`npm.cmd ci`

`npm.cmd run dev`

Aplikacijo odpremo na `http://localhost:5173`.
Ob delujočem backendu prikaže »Povezava z API je vzpostavljena.«

Vite med razvojem posreduje zahteve `/api` backendu na portu 3000.

### Preverjanje

V mapi `backend` izvedemo:

`npm.cmd run typecheck`

`npm.cmd run build`

V mapi `frontend` izvedemo:

`npm.cmd run build`

`npm.cmd run lint`

### Zaustavitev

Frontend in backend ustavimo s `Ctrl+C` v njunih terminalih.

Bazo ustavimo iz glavne mape:

`docker compose down`

Ta ukaz ohrani podatke v volume-u.

## Razvojni proces

Glavna veja je `main`. Spremembe se pripravljajo na ločenih razvojnih vejah in vključujejo v `main` prek pull requestov po strategiji GitHub Flow. Pomembne nove arhitekturne odločitve zabeležimo kot dodatne ADR-je; spremembo obstoječe odločitve dokumentiramo z novim ADR-jem, ki navede prejšnjega.


Vsak pull request mora vsebovati kratek opis opravljenih sprememb.