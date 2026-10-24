# Prisma ORM za dostop do PostgreSQL

* Status: Sprejeto
* Datum: 2026-10-24

## Kontekst in problem

Backend izvaja številne operacije nad povezanimi tabelami. Želimo omejiti količino ponavljajoče se SQL kode, ohraniti pregled nad podatkovnim modelom in podpreti tipizirane poizvedbe.

## Obravnavane možnosti

* **Neposredne SQL poizvedbe z `pg`:** največji nadzor nad SQL, a več ročnega preslikavanja in vzdrževanja.
* **TypeORM:** ORM z dekoratorji in relacijami, vendar drugačen način konfiguriranja sheme in migracij.
* **Prisma:** deklarativen model, generiran tipiziran odjemalec in migracije, a dodana odvisnost in manj neposrednega nadzora nad nekaterimi poizvedbami.

## Odločitev in utemeljitev

Izbrana je **Prisma**, ker podatkovni model projekta dobro ustreza njenemu deklarativnemu opisu in ker generiran odjemalec pomaga pri tipno varnem povezovanju TypeScript kode s PostgreSQL.

## Posledice

### Pozitivne

* Manj rutinske kode in jasnejši modeli relacij.
* Podpora migracijam in tipiziranim podatkovnim operacijam.

### Negativne

* Odvisnost od dodatnega orodja, njegovih različic in generiranega odjemalca.
* Za specifične optimizacije bodo lahko potrebne ročne SQL poizvedbe.

## Povezave

* [Podatkovni model](../03-podatkovni-model.md)
