# Atomarna potrditev menjave izmene in ponovno preverjanje konfliktov

* Status: Sprejeto
* Datum: 2026-10-24

## Kontekst in problem

Sodelavec lahko sprejme zahtevo, vendar lahko vodja potrdi menjavo šele pozneje. Medtem se utegne urnik spremeniti. Če sistem samo preveri stanje ob oddaji zahteve, lahko potrdi prekrivajoči se izmeni ali spremeni le del podatkov.

## Obravnavane možnosti

* **Preverjanje samo ob oddaji zahteve:** manj operacij, a ne zagotovi aktualnega urnika pri potrditvi.
* **Dve ločeni posodobitvi brez transakcije:** enostavno pisanje kode, vendar lahko nastane nekonsistentno stanje.
* **Ponovno preverjanje ob potrditvi in posodobitev znotraj ene transakcije:** več pozornosti sočasnosti, vendar boljša celovitost podatkov.

## Odločitev in utemeljitev

Izbrano je **ponovno preverjanje konflikta ob potrditvi in atomarna sprememba statusa zahteve ter dodeljenega zaposlenega v podatkovni transakciji**. Preverijo se status zahteve, prekrivanje izmen in nerazpoložljivost prevzemnika. Pri sočasnih potrditvah bo implementacija morala poskrbeti tudi za ustrezno zaklepanje oziroma zaznavanje konfliktov ter ponovni poskus ali zavrnitev.

## Posledice

### Pozitivne

* Manj tveganja za izgubljene posodobitve in nedosleden urnik.
* Potrditev menjave je skladen in preverljiv poslovni dogodek.

### Negativne

* Implementacija in testiranje sočasnosti sta zahtevnejša.
* Transakcije lahko ob konkurenci zahtevajo ponovitev ali zavrnitev operacije.

## Povezave

* [Podatkovni model](../03-podatkovni-model.md)
* [Uporabniška zgodba US-07](../05-uporabniske-zgodbe.md)
