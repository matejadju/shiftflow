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

V repozitoriju je pripravljena dokumentacija in projektna struktura. Implementacija frontenda, backenda in konfiguracije Docker Compose sledi v naslednjih nalogah. Ukazov `npm run dev` zato še ni mogoče izvajati, dokler ustrezni projekti niso inicializirani.

## Razvojni proces

Glavna veja je `main`. Spremembe se pripravljajo na ločenih razvojnih vejah in vključujejo v `main` prek pull requestov po strategiji GitHub Flow. Pomembne nove arhitekturne odločitve zabeležimo kot dodatne ADR-je; spremembo obstoječe odločitve dokumentiramo z novim ADR-jem, ki navede prejšnjega.
