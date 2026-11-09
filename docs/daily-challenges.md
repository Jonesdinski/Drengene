# Dagsudfordringer

Tre permanente, personlige opgaver tildeles ved første besøg hver dansk kalenderdag. Slot 0 er altid et frit screenshot (10 point). To forskellige, relevante opgaver trækkes fra kataloget. Point afhænger af opgaven og går op til 150 for de sjældneste mål. Hele kontoen deler opgaver og point på tværs af mains og alts.

Kun ejerens aktuelle opgaver sendes til browseren. Andre brugere modtager kun gennemførte opgaver og samlede point. Der er ingen administratorundtagelse, som afslører ufærdige opgaver i API'et.

Aflevering kræver en upload ejet af den aktuelle verificerede spiller og en eksplicit bekræftelse. Serveren downloader billedet fra den eksisterende private storage og beregner SHA-256. Identiske billedfiler kan kun udløse point én gang pr. konto, også efter gen-upload. Billedindhold vurderes ikke automatisk: screenshot og spillerens bekræftelse er beviset. Redigerede billeder har andre hashes; dette er et tillidsbaseret system for venner.

Point, offentlig gennemførelse, galleriopslag og journal gemmes i én transaktion med lås på ejerprofilen. Gentagne requests giver ingen ekstra point eller opslag. Point fastlægges på serveren ved tildeling og kan ikke vælges i browseren. Samlede point overlever dagskift og arkivering af galleriopslag.

## Separat migration og backup

`database/20261109093300_daily_challenges.sql` er en rent additiv migration, som kun opretter `lejrbalet.daily_challenges`, dens indeks og adgangsregler. Eksisterende tabeller og filer ændres ikke. Den er anvendt på det eksisterende Supabase-projekt før udrulning af koden.

Ved manuel anvendelse på en anden installation: tag først normal databasebackup af `lejrbalet` (især `profiles`, `entries`, `uploads` og `journal`) samt backup af storage-bucket `lejrbalet`. Tabellens fremmednøgler peger på disse eksisterende data. Migrationen er idempotent og findes også i `scripts/migrate.mjs`.

RLS er slået til, og direkte adgang er tilbagekaldt for `PUBLIC`, `anon` og `authenticated`. Kun serverens eksisterende databaseforbindelse bruges. Ingen nye offentlige tabeller eller service keys i klientkode.

## Validering

Isolerede PostgreSQL-tests dækker privatliv mellem konti, ejer af billedbevis, faste tildelinger, duplikerede afleveringer, genbrug af billedbytes, point, galleri, journal, CSRF, login, forfalskede point og dansk midnat inkl. sommertid. Browserkontrol af produktion må ikke aflevere falske screenshots eller optjene testpoint på rigtige konti.

## Opdatering: udskiftning og historier

`database/20261109094353_challenge_refresh.sql` tilføjer to kolonner til de nye udfordringer og ensretter navnet FOR THE HORDE i opgaver og tilknyttede galleriopslag. Tag backup af `lejrbalet.daily_challenges` og `lejrbalet.entries` inden manuel anvendelse. Eksisterende point og beviser bevares.

Hver konto har to udskiftninger pr. dagsopgave (ikke to i alt). Serveren låser profilen og opgaven, afviser gennemførte/udløbne opgaver og sikrer, at nye opgaver hverken overlapper dagens øvrige opgaver eller opgavens tidligere forslag. En udskiftning skifter ID, så en gammel åben uploadformular ikke kan gennemføre den nye opgave ved en fejl. Tælleren følger det permanente dag/slot, også efter genbesøg.

Valgfri historie, maks. 1.000 tegn, gemmes som galleriopslagets body i samme transaktion som pointene. Den vises som ren tekst i både galleri og offentlig gennemførelse.

## Rotation, karakterkrav og sjældenhed

Rotationen indeholder 109 originale opgaver i `lib/daily-challenge-catalog.ts`. Kataloget er redigerbart: minLevel, maxLevel, faction, classes, professions, category, weight og rarity styrer tildeling. Manglende faction følger hubbens Horde-standard; en eksplicit Alliance-karakter får ikke Horde-zoner eller Alliance-jagter. Manglende professions bliver ikke gættet.

Hver karakter evalueres samlet. En level 60 Mage og en level 10 Priest giver ikke adgang til en Priest-opgave fra level 30. Dungeon- og zoneintervaller har både minimum og maksimum; Wailing Caverns er bevidst sat til det konservative anbefalede interval 17–24, ikke adgangsminimum. Begge mains og alts tæller, men kun aktive karakterer på den aktuelle konto. UI viser relevante karakterers navne og levels. Screenshot-bevis og erklæring bruges stadig til selve gennemførelsen; der er ingen automatisk billed- eller combatlog-analyse.

Grundkategorierne vægtes explore 35, PvP 32, dungeon 14, social 10, professions 5 og egen klasse 4, og kun tilgængelige kategorier deltager. Inden for PvP har den almindelige FOR THE HORDE-opgave vægt 80 og giver 35 point. Seks klassejagter har hver vægt 2 og giver 100 point; healer-jagten har vægt 1 og giver 150 point. Det er vægte, ikke garanterede procenter af alle dagsopgaver. Hver opgave vælges uden dubletter blandt dagens øvrige opgaver og egne tidligere refresh-forslag.

Én fri screenshot-opgave tildeles som udgangspunkt hver dag. De to øvrige udtrækkes efter aktuelle karakterdata. Forslag fra de foregående tre dage nedvægtes til 25 % af deres normale vægt, bortset fra den almindelige FOR THE HORDE, som gerne må komme ofte. En ny dansk dato giver nye opgave-ID'er og nulstillede refresh-tællere. Opgaver tildeles på serveren ved besøg; en åben fane genhenter automatisk hvert 30. sekund og ved tilbagevenden til fanen. Der kræves ingen ekstern cron.

Ufærdige opgaver, som ikke længere passer efter levelændringer, karakterarkivering eller ændrede krav, erstattes uden brug af refresh. ID'et skiftes, så en gammel uploadformular ikke kan gennemføre en erstatning. Gennemførte opgaver og deres point ændres ikke. En konto uden kendte karakterlevels får kun generelle screenshot- og sociale opgaver, indtil karakterdata er tilgængelige.

`database/20261109100259_challenge_rotation.sql` udvider alene pointgrænsen fra 100 til 200 for at rumme sjældne opgaver. Ved manuel migration: tag backup af `lejrbalet.daily_challenges` først. Eksisterende point bliver ikke genberegnet.

### Kilder til levelkalibrering

Intervallerne er konservative produktvalg for passende udfordringer, ikke lovede adgangskrav. Se Forever-oversigterne nedenfor. Nye eller ændrede dungeons kræver en katalogopdatering; opgaver med ukendte bossnavne bliver ikke opfundet.

- https://worldofwarcraft.blizzard.com/en-us/news/24301455/explore-the-new-dungeons-of-world-of-warcraft-forever
- https://www.icy-veins.com/wow-forever/dungeons-overview/
- https://www.wowhead.com/forever/guide/dungeons-overview-locations-details
