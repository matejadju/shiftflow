# Docker Compose za lokalni PostgreSQL

* Status: Sprejeto
* Datum: 2026-10-24

## Kontekst in problem

Razvojno okolje mora omogočiti enostaven ponovljiv zagon podatkovne baze na različnih računalnikih. Ročna namestitev PostgreSQL zahteva nastavljanje različic, uporabnikov in storitev.

## Obravnavane možnosti

* **Lokalna namestitev PostgreSQL:** brez Dockerja, vendar več korakov pri nastavitvi sistema.
* **Upravljana baza v oblaku:** brez lokalne namestitve, vendar odvisnost od omrežja ter zunanji dostopni podatki.
* **PostgreSQL v Docker Compose:** enotna konfiguracija za razvoj, vendar odvisnost od nameščenega Dockerja.

## Odločitev in utemeljitev

Izbran je **Docker Compose za lokalni zagon PostgreSQL**. Tako lahko projekt določi različico baze, mrežo in obstojen volume. Frontend in backend se bosta med razvojem lahko zaganjala lokalno prek npm, kot je opredeljeno v arhitekturni dokumentaciji.

## Posledice

### Pozitivne

* Ponovljivo okolje in hitrejše začetno nastavljanje baze.
* Podatki se lahko ohranijo v Docker volumnu med ponovnimi zagoni.

### Negativne

* Potreben je delujoč Docker Engine oziroma Docker Desktop.
* Docker Compose datoteko in podatke o okolju je treba pozneje pripraviti in vzdrževati.

## Povezave

* [Lokalni zagon](../04-arhitektura-in-tehnoloski-sklad.md)
