# PostgreSQL kot relacijska podatkovna baza

* Status: Sprejeto
* Datum: 2026-10-24

## Kontekst in problem

Uporabniki, izmene, zahteve in nerazpoložljivosti so močno povezani. Ob potrditvi menjave se morata sprememba dodelitve in status zahteve zabeležiti usklajeno. Pomembne so referenčne omejitve in transakcije.

## Obravnavane možnosti

* **MongoDB:** fleksibilen dokumentni model, vendar tu ni bistvene prednosti, povezave in konsistenco bi bilo treba podrobneje načrtovati.
* **SQLite:** zelo preprosta lokalna postavitev, manj primeren izbor za predvideno večuporabniško spletno storitev.
* **PostgreSQL:** relacije, tuji ključi in transakcije, a zahtevana nastavitev ločene baze.

## Odločitev in utemeljitev

Izbran je **PostgreSQL**, ker so podatki naravno relacijski. Tuji ključi omogočajo vezavo zahtev na izmene ter uporabnike, transakcije pa podpirajo varno potrjevanje menjav. Namen projekta ni obdelava nestrukturiranih dokumentov.

## Posledice

### Pozitivne

* Podpora referenčni integriteti, transakcijam in poizvedbam po povezanih podatkih.
* Jasna struktura modela olajša preverjanje pravil.

### Negativne

* Potrebna je inicializacija in skrb za podatkovno bazo.
* Spremembe sheme zahtevajo migracije.

## Povezave

* [Podatkovni model](../03-podatkovni-model.md)
* [ADR-0009](0009-atomarna-potrditev-menjave.md)
