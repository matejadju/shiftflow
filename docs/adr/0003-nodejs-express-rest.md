# Node.js, Express in TypeScript za REST API

* Status: Sprejeto
* Datum: 2026-10-24

## Kontekst in problem

Zaledje mora preverjati pravice, obdelovati zahteve za menjave in komunicirati z relacijsko bazo. Za študijski projekt je pomemben hiter razvoj enostavnega API-ja in pregledno ločevanje poti, kontrolerjev ter poslovnih storitev.

## Obravnavane možnosti

* **Spring Boot (Java):** zrela arhitektura in varnostni ekosistem, a več začetne konfiguracije za majhen projekt.
* **Python FastAPI:** enostavna izdelava API-ja in dobra validacija, vendar drugačen jezik kot na frontendu.
* **Node.js in Express s TypeScriptom:** enoten jezik na obeh straneh in preproste poti, vendar več odgovornosti za lastno strukturo projekta.

## Odločitev in utemeljitev

Izbrani so **Node.js, Express in TypeScript**. Enoten jezik poenostavi razvoj in omogoča jasno oblikovanje REST operacij za uporabnike, izmene ter zahteve. Poslovna pravila bodo v storitvenem sloju, ne neposredno v HTTP usmerjevalnikih.

## Posledice

### Pozitivne

* Enoten jezik in podobna razvojna orodja na obeh straneh sistema.
* Majhen okvir omogoča postopno dodajanje funkcionalnosti.

### Negativne

* Strukturo projektnih slojev, upravljanje napak in varnost moramo določiti sami.
* Napačna uporaba asinhronih postopkov lahko povzroči napake pri delu z bazo.

## Povezave

* [Arhitektura](../04-arhitektura-in-tehnoloski-sklad.md)
