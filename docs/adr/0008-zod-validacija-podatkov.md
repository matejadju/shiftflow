# Zod za validacijo vhodnih podatkov REST API-ja

* Status: Sprejeto
* Datum: 2026-10-24

## Kontekst in problem

Podatki iz uporabniških obrazcev, na primer datum, čas, prejemnik menjave ali e-pošta, lahko manjkajo ali so napačnega tipa. TypeScript preverja tipe med razvojem, ne pa resničnih HTTP zahtev ob izvajanju.

## Obravnavane možnosti

* **Ročni `if` stavki:** brez dodatne odvisnosti, vendar ponavljanje pravil in neenotna sporočila o napakah.
* **Joi:** ustaljena knjižnica za validacijo, a ločena shema od TypeScript tipov.
* **Zod:** sheme za preverjanje podatkov ob izvajanju in izpeljava TypeScript tipov, ob dodatni knjižnici.

## Odločitev in utemeljitev

Izbran je **Zod** za preverjanje vhodov na mejah REST API-ja. Sheme bodo določale dovoljene oblike podatkov, poslovna pravila (npr. prekrivanje izmen ali dovoljenja) pa bodo ostala v zalednih storitvah.

## Posledice

### Pozitivne

* Konsistentna preverjanja oblike vhodnih podatkov in jasnejše napake.
* Manj razlik med deklariranimi TypeScript tipi in preverjanjem med izvajanjem.

### Negativne

* Dodatna odvisnost in delo pri pisanju shem.
* Zod sam ne more nadomestiti poizvedb v bazo in preverjanja poslovnih pravil.

## Povezave

* [Arhitektura](../04-arhitektura-in-tehnoloski-sklad.md)
