# Preverjanje MVP – ShiftFlow

Datum preverjanja: 6. 11. 2026

Preverjanje je bilo izvedeno lokalno z uporabniki vodja, Ana in Luka.

## Avtomatizirano preverjanje

| Preverjanje | Rezultat |
| --- | --- |
| Backend testi | 62 uspešnih, 0 neuspešnih |
| Backend typecheck | Uspešno |
| Backend build | Uspešno |
| Frontend build | Uspešno |
| Frontend lint | Uspešno |

Testi pokrivajo prijavo, pravice, urnike, nerazpoložljivost in potek
menjave, vključno s sočasnimi zahtevami in razveljavitvijo transakcije.

## Ročno preverjanje uporabniških zgodb

| Zgodba | Preverjeni pogoji | Rezultat |
| --- | --- | --- |
| US-01 | Prijava, napačni podatki, odjava in zaščita strani glede na vlogo | Uspešno |
| US-02 | Ustvarjanje in dodeljevanje osnutka, validacija časa ter objava urnika | Uspešno |
| US-03 | Lastne objavljene izmene, datum in čas, preklop tedna ter prazen teden | Uspešno |
| US-04 | Dodajanje in brisanje lastne nerazpoložljivosti ter preverjanje pri potrditvi menjave | Uspešno |
| US-05 | Oddaja zahteve za lastno objavljeno izmeno, izbor sodelavca in preprečevanje druge odprte zahteve | Uspešno |
| US-06 | Pregled prejete zahteve, sprejem in zavrnitev brez spremembe urnika | Uspešno |
| US-07 | Odločitev vodje, preverjanje konfliktov in posodobitev dodelitve | Uspešno |

## Celoten uspešen potek

1. Vodja ustvari Ani izmeno kot osnutek.
2. Ana osnutka ne vidi.
3. Vodja objavi urnik; Ana vidi svojo izmeno, Luka pa je ne vidi.
4. Ana predlaga Luko za prevzemnika.
5. Luka sprejme zahtevo; izmena še vedno pripada Ani.
6. Vodja potrdi menjavo.
7. Tedenski urnik prikazuje Luko kot dodeljenega zaposlenega.
8. Po osvežitvi izmena izgine iz Aninega koledarja in se pojavi v Lukinem.
9. Zahteva ima status potrjena.

Rezultat: uspešno.

## Zavrnitev in konflikti

| Scenarij | Opaženi rezultat |
| --- | --- |
| Sodelavec zavrne zahtevo | Zahteva je zavrnjena, dodelitev ostane nespremenjena |
| Vodja zavrne sprejeto zahtevo | Zahteva je zavrnjena, dodelitev ostane nespremenjena |
| Prevzemnik ima prekrivajočo izmeno | Potrditev je blokirana z razlogom; zahteva ostane sprejeta |
| Prevzemnik je nerazpoložljiv | Potrditev je blokirana z razlogom; urnik ostane nespremenjen |
| Drug zaposleni odpre nerazpoložljivost | Vidi samo svoje vnose |
| Neprijavljen uporabnik odpre zaščiteno stran | Preusmerjen je na prijavo |
| Zaposleni odpre stran vodje | Dostop ni dovoljen |
| Izbran teden nima izmen | Prikazano je ustrezno sporočilo |

## Dodatne zaščite

Avtomatizirano so preverjeni:
- Preprečevanje prekrivajočih izmen in nerazpoložljivosti.
- Dovoljeni stični časovni intervali.
- Največ ena odprta zahteva na izmeno.
- Sočasni odgovori sodelavca in odločitve vodje.
- Preprečevanje prekrivajočih dodelitev ob sočasnih potrditvah.
- Razveljavitev spremembe dodelitve, če zadnji upis transakcije ne uspe.

## Obseg

Preverjanje pokriva MVP zgodbe US-01–US-07.
Zgodbe US-08–US-13 ostajajo nadgradnje po MVP.