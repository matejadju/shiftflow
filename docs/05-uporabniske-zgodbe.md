# Uporabniške zgodbe – ShiftFlow

Dokument opisuje vseh 13 predvidenih funkcionalnosti iz prve naloge. Oznaka **MVP** označuje funkcionalnosti prve delujoče različice.

## US-01 – Prijava in dostop glede na vlogo (MVP)

**Povezana funkcionalnost:** Prijava in dostop glede na vlogo  
**Uporabniška vloga:** Uporabnik  
**Uporabniška zgodba:** Kot uporabnik se želim prijaviti v aplikacijo, da lahko dostopam do funkcionalnosti, ki so namenjene moji vlogi.

**Sprejemni kriteriji (Acceptance criteria):**

- Prijava je mogoča z veljavnim e-poštnim naslovom in geslom.
- Ob napačnih prijavnih podatkih sistem prikaže sporočilo o neuspešni prijavi.
- Po uspešni prijavi uporabnik dostopa samo do funkcionalnosti svoje vloge.
- Neprijavljen uporabnik ne more dostopati do zaščitenih strani.

## US-02 – Priprava, dodeljevanje in objava tedenskega urnika (MVP)

**Povezana funkcionalnost:** Priprava, dodeljevanje in objava tedenskega urnika  
**Uporabniška vloga:** Vodja izmen  
**Uporabniška zgodba:** Kot vodja izmen želim pripraviti in objaviti tedenski urnik, da zaposleni vedo, kdaj delajo.

**Sprejemni kriteriji (Acceptance criteria):**

- Vodja lahko ustvari izmene z datumom, uro začetka in konca ter dodeljenim zaposlenim.
- Sistem zavrne izmeno, pri kateri je ura konca enaka ali pred uro začetka.
- Vodja lahko urnik shrani kot osnutek in ga pozneje objavi.
- Zaposleni v svojem urniku vidijo samo objavljene izmene.

## US-03 – Koledarski pregled delovnih izmen (MVP)

**Povezana funkcionalnost:** Koledarski pregled delovnih izmen  
**Uporabniška vloga:** Zaposleni  
**Uporabniška zgodba:** Kot zaposleni želim videti svoje izmene v koledarju, da lažje načrtujem svoj čas.

**Sprejemni kriteriji (Acceptance criteria):**

- Koledar prikazuje datum ter začetno in končno uro vsake objavljene izmene.
- Zaposleni lahko preklaplja med tedni.
- Zaposleni vidi svoje izmene, ne pa osebnega urnika drugih zaposlenih.
- Če za izbrani teden nima izmen, sistem prikaže ustrezno sporočilo.

## US-04 – Označevanje nerazpoložljivosti (MVP)

**Povezana funkcionalnost:** Označevanje nerazpoložljivosti  
**Uporabniška vloga:** Zaposleni  
**Uporabniška zgodba:** Kot zaposleni želim označiti, kdaj nisem na voljo, da se to upošteva pri razporejanju in menjavah.

**Sprejemni kriteriji (Acceptance criteria):**

- Zaposleni lahko vnese datum ter začetno in končno uro nerazpoložljivosti.
- Sistem zavrne obdobje, pri katerem je končna ura enaka ali pred začetno.
- Zaposleni lahko pregleda in odstrani svoje vnose nerazpoložljivosti.
- Sistem pri potrditvi menjave preveri, ali se nova izmena prekriva z nerazpoložljivostjo prevzemnika.

## US-05 – Oddaja zahteve za menjavo izmene (MVP)

**Povezana funkcionalnost:** Oddaja zahteve za menjavo izmene  
**Uporabniška vloga:** Zaposleni  
**Uporabniška zgodba:** Kot zaposleni želim predlagati menjavo svoje izmene s sodelavcem, da lahko uredim zamenjavo, ko ne morem delati.

**Sprejemni kriteriji (Acceptance criteria):**

- Zaposleni lahko izbere samo svojo objavljeno izmeno.
- Pri zahtevi izbere drugega zaposlenega kot predvidenega prevzemnika.
- Po oddaji zahteva dobi status »v čakanju« in je vidna izbranemu sodelavcu.
- Sistem prepreči oddajo druge odprte zahteve za isto izmeno.

## US-06 – Sprejem ali zavrnitev menjave s strani sodelavca (MVP)

**Povezana funkcionalnost:** Sprejem ali zavrnitev menjave s strani sodelavca  
**Uporabniška vloga:** Zaposleni  
**Uporabniška zgodba:** Kot zaposleni želim sprejeti ali zavrniti predlagano menjavo, da sam odločim, ali bom prevzel sodelavčevo izmeno.

**Sprejemni kriteriji (Acceptance criteria):**

- Uporabnik vidi zahteve, pri katerih je izbran kot prevzemnik.
- Sprejme ali zavrne lahko samo zahtevo s statusom »v čakanju«.
- Ob sprejemu se status spremeni v »sprejeta« in zahteva čaka na vodjo.
- Ob zavrnitvi se status spremeni v »zavrnjena«, razpored pa ostane nespremenjen.

## US-07 – Potrditev menjave, preverjanje in posodobitev urnika (MVP)

**Povezana funkcionalnost:** Potrditev menjave, preverjanje in posodobitev urnika  
**Uporabniška vloga:** Vodja izmen  
**Uporabniška zgodba:** Kot vodja izmen želim preveriti in potrditi menjavo, da urnik ostane pravilen in brez prekrivanj.

**Sprejemni kriteriji (Acceptance criteria):**

- Vodja lahko odloča samo o zahtevah s statusom »sprejeta«.
- Pred potrditvijo sistem preveri prekrivanje z drugimi izmenami in nerazpoložljivost prevzemnika.
- Če obstaja prekrivanje, sistem zavrne potrditev in prikaže razlog.
- Ob uspešni potrditvi se v enem postopku posodobita dodeljeni zaposleni in status zahteve v »potrjena«; ob zavrnitvi razpored ostane nespremenjen.

## US-08 – Izračun načrtovanih delovnih ur

**Povezana funkcionalnost:** Izračun načrtovanih delovnih ur  
**Uporabniška vloga:** Zaposleni  
**Uporabniška zgodba:** Kot zaposleni želim videti skupno število načrtovanih delovnih ur, da vem, koliko dela imam v izbranem obdobju.

**Sprejemni kriteriji (Acceptance criteria):**

- Uporabnik lahko izbere teden, za katerega želi izračun.
- Sistem sešteje trajanje njegovih objavljenih izmen v izbranem tednu.
- Po potrjeni menjavi se seštevek pri obeh zaposlenih ustrezno posodobi.

## US-09 – Zgodovina opravljenih menjav

**Povezana funkcionalnost:** Zgodovina opravljenih menjav  
**Uporabniška vloga:** Zaposleni  
**Uporabniška zgodba:** Kot zaposleni želim pregledati pretekle menjave, da lahko preverim, katere izmene sem prevzel ali predal.

**Sprejemni kriteriji (Acceptance criteria):**

- Prikazane so potrjene menjave, v katerih je uporabnik sodeloval.
- Vsak zapis prikazuje datum izmene ter predlagatelja in prevzemnika.
- Zapisi so razvrščeni od najnovejše menjave do najstarejše.

## US-10 – Objava prostih izmen in prijava nanje

**Povezana funkcionalnost:** Objava prostih izmen in prijava nanje  
**Uporabniška vloga:** Vodja izmen in zaposleni  
**Uporabniška zgodba:** Kot vodja izmen želim objaviti proste izmene, zaposleni pa se želim nanje prijaviti, da se nepokrite izmene lažje zapolnijo.

**Sprejemni kriteriji (Acceptance criteria):**

- Vodja lahko objavi izmeno brez dodeljenega zaposlenega.
- Zaposleni vidi seznam objavljenih prostih izmen in se lahko prijavi na izbrano izmeno.
- Vodja lahko izbere prijavljenega zaposlenega za prosto izmeno.
- Sistem prepreči dodelitev, če se izmena prekriva z drugo izmeno izbranega zaposlenega.

## US-11 – Pregled zahtev glede na status

**Povezana funkcionalnost:** Pregled zahtev glede na status  
**Uporabniška vloga:** Zaposleni  
**Uporabniška zgodba:** Kot zaposleni želim filtrirati svoje zahteve za menjavo po statusu, da hitro vidim, katere so še odprte.

**Sprejemni kriteriji (Acceptance criteria):**

- Uporabnik vidi zahteve, ki jih je oddal ali prejel.
- Zahteve lahko filtrira po statusu: v čakanju, sprejeta, zavrnjena ali potrjena.
- Pri vsaki zahtevi so prikazani izmena, sodelavec in trenutni status.

## US-12 – Obvestila v aplikaciji

**Povezana funkcionalnost:** Obvestila v aplikaciji  
**Uporabniška vloga:** Zaposleni in vodja izmen  
**Uporabniška zgodba:** Kot uporabnik želim prejemati obvestila o zahtevah in odločitvah, da pravočasno izvem za spremembe.

**Sprejemni kriteriji (Acceptance criteria):**

- Prevzemnik prejme obvestilo, ko mu je poslana zahteva za menjavo.
- Vodja prejme obvestilo, ko prevzemnik sprejme zahtevo.
- Predlagatelj in prevzemnik prejmeta obvestilo o končni odločitvi vodje.
- Uporabnik lahko označi obvestilo kot prebrano.

## US-13 – Izvoz urnika v CSV

**Povezana funkcionalnost:** Izvoz urnika v CSV  
**Uporabniška vloga:** Vodja izmen  
**Uporabniška zgodba:** Kot vodja izmen želim izvoziti urnik v CSV, da ga lahko uporabim tudi zunaj aplikacije.

**Sprejemni kriteriji (Acceptance criteria):**

- Vodja lahko izbere teden, za katerega izvozi urnik.
- Datoteka CSV vsebuje datum, začetno uro, končno uro in dodeljenega zaposlenega.
- Izvoz vključuje samo objavljene izmene iz izbranega tedna.
