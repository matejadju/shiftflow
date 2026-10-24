# Podatkovni model

Za shranjevanje podatkov bo uporabljena relacijska podatkovna baza PostgreSQL.

## Glavne entitete

**1. Uporabnik (User)**

* id (PK)
* ime
* priimek
* email
* geslo_hash
* vloga (zaposleni, vodja, administrator)

**2. Izmena (Shift)**

* id (PK)
* zaposleni_id (FK → User)
* datum
* ura_zacetka
* ura_konca
* status (osnutek, objavljena)

**3. Zahteva za menjavo (SwapRequest)**

* id (PK)
* izmena_id (FK → Shift)
* predlagatelj_id (FK → User)
* prevzemnik_id (FK → User)
* status (v_cakanju, sprejeta, zavrnjena, potrjena)
* datum_zahteve

**4. Nerazpoložljivost (Unavailability)**

* id (PK)
* zaposleni_id (FK → User)
* datum
* ura_od
* ura_do

## Povezave med entitetami

* En uporabnik ima lahko več dodeljenih izmen (1:N).
* Ena izmena ima lahko več zahtev za menjavo (1:N).
* Vsaka zahteva za menjavo je povezana s predlagateljem in predvidenim prevzemnikom (User).
* En uporabnik lahko vnese več obdobij nerazpoložljivosti (1:N).

## Osnutek podatkovnega modela

User (1) → (N) Shift

Shift (1) → (N) SwapRequest

User (1) → (N) SwapRequest (predlagatelj / prevzemnik)

User (1) → (N) Unavailability

Ob potrditvi menjave sistem posodobi polje `zaposleni_id` pri ustrezni izmeni. Menjava se izvede le, če novi zaposleni takrat nima druge izmene in ni označil nerazpoložljivosti.
