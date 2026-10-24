# JWT za prijavo in preverjanje vlog na backendu

* Status: Sprejeto
* Datum: 2026-10-24

## Kontekst in problem

Sistem pozna tri vloge: zaposlenega, vodjo izmen in administratorja. Po prijavi mora vsaka zahteva do API-ja omogočati preverjanje identitete in upravičenosti; nepooblaščen zaposleni ne sme spreminjati tujega urnika ali potrjevati menjav.

## Obravnavane možnosti

* **Strežniške seje s piškotkom:** enostaven preklic sej in manj izpostavljenih podatkov v odjemalcu, vendar je treba hraniti stanje sej.
* **JWT z omejeno veljavnostjo:** ne potrebuje centralne shrambe sej za osnovno preverjanje, vendar je preklic že izdanega žetona zahtevnejši.
* **Zunanja identitetna storitev:** manj lastne implementacije, vendar uvaja odvisnost in dodatno konfiguracijo za osnovni študijski projekt.

## Odločitev in utemeljitev

Izbrana sta **prijava z e-pošto in geslom** ter **kratkoživi podpisani JWT** za dostop do REST API-ja. Gesla bodo shranjena kot zgoščene vrednosti z bcrypt, vloge in lastništvo podatkov pa bo preverjal Express middleware oziroma zaledne storitve. Podrobnosti varnega prenosa in hranjenja žetona ter politike osveževanja bodo določene pri implementaciji; žeton ne sme vsebovati skrivnosti.

## Posledice

### Pozitivne

* Enoten način preverjanja identitete pri API klicih.
* Ločena in dosledna avtorizacija ne glede na prikaz uporabniškega vmesnika.

### Negativne

* Treba je pravilno upravljati podpise, iztek, varnost prenosa in hrambe žetonov.
* Takojšnji preklic žetonov zahteva dodatno rešitev.

## Povezave

* [Uporabniške vloge](../02-funkcionalnosti-in-obseg.md)
