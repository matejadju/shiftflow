# React in TypeScript za frontend

* Status: Sprejeto
* Datum: 2026-10-24

## Kontekst in problem

Uporabniški vmesnik vsebuje tedenski koledar, obrazce, sezname in različne prikaze glede na vlogo. Ob spremembi izmen se mora prikaz posodobiti, tipične napake pri podatkovnih strukturah pa želimo odkriti pred zagonom.

## Obravnavane možnosti

* **HTML, CSS in navaden JavaScript:** najmanj začetne konfiguracije, vendar več ročnega upravljanja stanja vmesnika.
* **Vue s TypeScriptom:** primeren reaktiven pristop, vendar bi zahteval drugačen tehnološki ekosistem in učenje.
* **React s TypeScriptom:** komponente in preverjanje tipov, a potreba po nastavitvi orodij in obvladovanju stanja.

## Odločitev in utemeljitev

Izbrana sta **React in TypeScript**, ker je mogoče koledar, menije in obrazce razdeliti na ponovno uporabne komponente. TypeScript poenostavi usklajevanje struktur podatkov med frontendom in REST API-jem. CSS zadostuje za oblikovanje začetnega uporabniškega vmesnika.

## Posledice

### Pozitivne

* Ponovna uporaba komponent in lažje vzdrževanje kompleksnejšega koledarja.
* Statično preverjanje tipov zmanjša število nekaterih napak pri integraciji.

### Negativne

* Potrebna sta gradnja aplikacije in nastavitev razvojnih orodij.
* Stanje in nalaganje podatkov zahtevata dodatno organizacijo.

## Povezave

* [Wireframe-i](../06-wireframes.md)
