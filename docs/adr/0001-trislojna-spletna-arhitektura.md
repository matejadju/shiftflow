# Trislojna spletna arhitektura z REST API-jem

* Status: Sprejeto
* Datum: 2026-10-24

## Kontekst in problem

ShiftFlow obravnava uporabniške prijave, razporejanje izmen in potrjevanje menjav. Poslovna pravila, kot so preverjanje vlog in prekrivanja izmen, morajo veljati za vse uporabnike in ne smejo biti odvisna samo od uporabniškega vmesnika. Potrebujemo jasno ločitev prikaza, poslovne logike in podatkov.

## Obravnavane možnosti

* **Samostojen odjemalec z neposrednim dostopom do baze:** manj komponent, vendar otežena zaščita podatkov in centraliziran nadzor pravic.
* **Monolitna strežniško izrisana spletna aplikacija:** enoten projekt in manj komunikacijskih plasti, vendar manj fleksibilen ločen razvoj uporabniškega vmesnika.
* **Ločen frontend, REST backend in relacijska baza:** jasna ločitev odgovornosti in centralna poslovna pravila, a dodatna konfiguracija komunikacije.

## Odločitev in utemeljitev

Izbrana je **trislojna spletna arhitektura**: React frontend komunicira z Node.js/Express backendom prek HTTP in JSON, backend pa dostopa do PostgreSQL. Zahteve za menjavo, avtorizacija in preverjanje konflikta se izvajajo na backendu, ne samo v brskalniku. Takšna struktura je primerna za postopno izdelavo aplikacije v okviru nalog.

## Posledice

### Pozitivne

* Jasna delitev odgovornosti in možnost samostojnega testiranja poslovnih pravil.
* Centralno preverjanje dostopa in pravil menjav.
* Posamezne plasti sistema je mogoče spreminjati in nadgrajevati neodvisno, če ostanejo dogovorjeni vmesniki med njimi nespremenjeni.

### Negativne

* Potrebna sta dva razvojna projekta ter dogovor o REST vmesniku.
* Dodana sta omrežna komunikacija in obravnava napak med plastmi.

## Povezave

* [Arhitektura](../04-arhitektura-in-tehnoloski-sklad.md)
