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

Implementirani so Prisma modeli User, Shift, Unavailability in SwapRequest,
začetna migracija ter začetni uporabniki za lokalni razvoj.

Implementirana sta API za prijavo z JWT in preverjanje dostopa glede
na uporabniško vlogo. Implementirani so prijavni obrazec, zaščitene strani, navigacija glede
na uporabniško vlogo in odjava. Po poteku prijave aplikacija uporabnika
preusmeri na ponovno prijavo. Upravljanje izmen še ni implementirano.

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

### Priprava podatkovne baze s Prisma

Po namestitvi odvisnosti v mapi `backend` v datoteki `backend/.env`
nastavimo:

```dotenv
DATABASE_URL=postgresql://shiftflow:YOUR_PASSWORD@localhost:5432/shiftflow?schema=public
SEED_PASSWORD=YOUR_LOCAL_TEST_PASSWORD
```

`YOUR_PASSWORD` zamenjamo z geslom za PostgreSQL iz glavne datoteke `.env`.
Posebne znake v geslu v povezovalnem URL-ju ustrezno URL-kodiramo.
`SEED_PASSWORD` mora vsebovati vsaj 12 znakov.

Ob zagnani bazi v mapi `backend` izvedemo:

```powershell
npm.cmd ci
npm.cmd exec -- prisma generate
npm.cmd exec -- prisma migrate deploy
npm.cmd exec -- prisma db seed
npm.cmd exec -- tsx prisma/verify-seed.ts
```

Ukazi pripravijo tudi prazno bazo. Ustvarjeni so naslednji lokalni
testni uporabniki:

| E-pošta | Vloga |
| --- | --- |
| maja.vodja@example.com | MANAGER |
| ana.novak@example.com | EMPLOYEE |
| luka.kovac@example.com | EMPLOYEE |

Novi uporabniki dobijo geslo iz `SEED_PASSWORD`, shranjeno z bcrypt.
Ponovljen seed ne podvoji uporabnikov in ne spremeni obstoječih gesel.

Migracije hranimo v Git. Generirani Prisma klient je izključen iz Git
in ga po pridobitvi projekta ustvarimo z `prisma generate`.

Za novo spremembo modelov med razvojem uporabimo
`npm.cmd exec -- prisma migrate dev --name opis_spremembe`.
Že uporabljenih migracij ne spreminjamo.

Začetna migracija vsebuje tudi omejitve za veljavnost časovnih intervalov,
različna udeleženca menjave ter največ eno odprto zahtevo na izmeno.

### 3. Backend

V ločenem terminalu:

`cd backend`

`npm.cmd ci`

`npm.cmd run dev`

API je dosegljiv na `http://localhost:3000`.
Endpoint `http://localhost:3000/api/health` vrne:

`{"status":"ok","service":"shiftflow-api"}`

Za zagon backenda potrebujemo tudi `JWT_SECRET` v datoteki `backend/.env`.
Naključno vrednost ustvarimo z ukazom:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Rezultat shranimo kot `JWT_SECRET`. Ključa ne vključujemo v Git.
Backend ob zagonu preveri konfiguracijo in povezavo s podatkovno bazo.

### 4. Frontend

V drugem terminalu:

`cd frontend`

`npm.cmd ci`

`npm.cmd run dev`

Aplikacijo odpremo na `http://localhost:5173`.
Neprijavljen uporabnik je preusmerjen na `/login`.

Za prijavo uporabimo začetne uporabnike in geslo iz `SEED_PASSWORD`.
Zaposleni dostopa do začetne strani, vodja pa tudi do `/manager`.

JWT žeton se hrani v `sessionStorage` trenutne kartice.
Osvežitev strani ohrani prijavo, odjava odstrani žeton.
Po poteku žetona je potrebna ponovna prijava.

Zaščita strani v brskalniku dopolnjuje preverjanje pravic na backendu.

## Prijava in preverjanje dostopa

### POST /api/auth/login

Telo zahteve JSON:

```json
{
  "email": "ana.novak@example.com",
  "password": "<geslo lokalnega testnega uporabnika>"
}
```

Uspešna prijava vrne JWT žeton in osnovne podatke uporabnika.
Geslo in njegova zgoščena vrednost nista vključena v odgovor.
Žeton velja eno uro.

### GET /api/auth/me

Zahteva mora vsebovati glavo:

```text
Authorization: Bearer <žeton>
```

Endpoint vrne podatke prijavljenega uporabnika. Middleware pri vsakem
zahtevku preveri žeton in pridobi trenutno uporabniško vlogo iz baze.

### Odzivi ob napakah

- `400`: neveljavni vhodni podatki.
- `401`: napačni prijavni podatki ali manjkajoč, neveljaven oziroma potekel žeton.
- `403`: uporabnik nima zahtevane vloge.

## Avtomatizirani testi backenda

Testi zahtevajo zagnano PostgreSQL bazo z uporabljeno migracijo,
seed uporabnike ter nastavljeni spremenljivki `JWT_SECRET` in
`SEED_PASSWORD` v `backend/.env`.

Iz mape `backend` izvedemo:

```powershell
npm.cmd run test
```

Testi preverijo uspešno prijavo, vhodne podatke, napačno geslo,
neobstoječega uporabnika, veljavnost žetonov in dostop glede na vlogo.
HTTP strežnika ni treba posebej zagnati.

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