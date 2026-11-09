# Dagsudfordringer

Tre permanente, personlige opgaver tildeles ved første besøg hver dansk kalenderdag. Slot 0 er altid et frit screenshot (10 point). To forskellige opgaver trækkes fra kataloget, med 20 eller 30 point. Hele kontoen deler opgaver og point på tværs af mains og alts.

Kun ejerens aktuelle opgaver sendes til browseren. Andre brugere modtager kun gennemførte opgaver og samlede point. Der er ingen administratorundtagelse, som afslører ufærdige opgaver i API'et.

Aflevering kræver en upload ejet af den aktuelle verificerede spiller og en eksplicit bekræftelse. Serveren downloader billedet fra den eksisterende private storage og beregner SHA-256. Identiske billedfiler kan kun udløse point én gang pr. konto, også efter gen-upload. Billedindhold vurderes ikke automatisk: screenshot og spillerens bekræftelse er beviset. Redigerede billeder har andre hashes; dette er et tillidsbaseret system for venner.

Point, offentlig gennemførelse, galleriopslag og journal gemmes i én transaktion med lås på ejerprofilen. Gentagne requests giver ingen ekstra point eller opslag. Point fastlægges på serveren ved tildeling og kan ikke vælges i browseren. Samlede point overlever dagskift og arkivering af galleriopslag.

## Separat migration og backup

`database/20261109093300_daily_challenges.sql` er en rent additiv migration, som kun opretter `lejrbalet.daily_challenges`, dens indeks og adgangsregler. Eksisterende tabeller og filer ændres ikke. Den er anvendt på det eksisterende Supabase-projekt før udrulning af koden.

Ved manuel anvendelse på en anden installation: tag først normal databasebackup af `lejrbalet` (især `profiles`, `entries`, `uploads` og `journal`) samt backup af storage-bucket `lejrbalet`. Tabellens fremmednøgler peger på disse eksisterende data. Migrationen er idempotent og findes også i `scripts/migrate.mjs`.

RLS er slået til, og direkte adgang er tilbagekaldt for `PUBLIC`, `anon` og `authenticated`. Kun serverens eksisterende databaseforbindelse bruges. Ingen nye offentlige tabeller eller service keys i klientkode.

## Validering

Isolerede PostgreSQL-tests dækker privatliv mellem konti, ejer af billedbevis, faste tildelinger, duplikerede afleveringer, genbrug af billedbytes, point, galleri, journal, CSRF, login, forfalskede point og dansk midnat inkl. sommertid. Browserkontrol af produktion må ikke aflevere falske screenshots eller optjene testpoint på rigtige konti.
