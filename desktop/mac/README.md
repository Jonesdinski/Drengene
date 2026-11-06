# Lejrbalet Sync til Mac 0.4.0

Til macOS 13 Ventura eller nyere, både Apple Silicon og Intel. Selvstændig app uden ekstra runtime.

1. Åbn DMG-filen, og træk Lejrbalet Sync til Programmer. Åbn den derfra.
2. Åbn hubbens /sync-guide. Installér FlockSync-addonet og opret din personlige forbindelsesnøgle.
3. Indsæt nøglen i appen, vælg WoW-klientmappen med Interface og WTF, og tryk Gem og forbind.
4. Lad Start automatisk ved login være markeret, hvis appen skal starte med din Mac. Godkend eventuelt under Systemindstillinger → Generelt → Loginemner.
5. Scan karaktererne i FlockSync, og brug /reload eller log ud. Tilknyt nye karakterer én gang på hubben.

Den røde luk-knap skjuler vinduet. Appen og sync fortsætter i menulinjen ved flammeikonet. Vælg Åbn for at hente vinduet frem eller Afslut Lejrbalet Sync for at stoppe helt. Ved slukning eller logout fra computeren stopper appen; den kan starte igen ved næste login. Deaktivér automatisk opstart før du sletter appen fra Programmer.

Forbindelsesnøglen opbevares i macOS' nøglering. Almindelige indstillinger og fil-hashes gemmes i ~/Library/Application Support/LejrbaletSync. Kun egne karakterers udvalgte felter, udstyret gear og professionsniveauer sendes til hubben over HTTPS. Ingen Lua-kode køres.

Dette er en testudgave uden udgiversignatur og Apple-notarisering (kun lokal ad hoc-signatur), ikke Apple Developer ID-signeret. macOS kan blokere åbning. Godkend kun den forventede download fra dette repository; Slå ikke Gatekeeper fra. Ved behov kan den konkrete app godkendes via Systemindstillinger → Anonymitet & sikkerhed. Organisationens politik kan forhindre dette.

CI bygger begge processorarkitekturer, tester parseren og tester, at vinduet kan lukkes, mens timer og menulinje fortsætter. En rigtig FlockSync-fil, WoW-installation, nøglering og genstart/login på brugerens Mac skal stadig afprøves. WoW Forever skal kunne køre lokalt og skrive SavedVariables på Mac; denne app gør ikke selve spillet Mac-kompatibelt. Ved Wine/CrossOver vælges den faktiske klientmappe i bottle/Windows-drevet.

Byg på Mac: `bash desktop/mac/build.sh`. Koden er en uafhængig uploader og indeholder ikke FlockSync-udviklerens kode.

## 0.4.0
Fælles lejrbålsikon til app og menulinje. Varm mørk baggrund med orange knapper. Læser vores eget addons LejrbaletSync.lua; bruger FlockSync.lua, hvis den nye fil endnu ikke findes i kontomappen. Guld, XP, lokation, gear og professionsniveauer følger med. Eksisterende konto og nøglering bevares ved opdatering. Brug /lejrbalet og /reload i spillet.
