# Lejrbalet Companion 0.5.0
Originalt, selvstændigt addon til Lejrbalet-hubben. Ingen FlockSync-kode eller guild-afhængighed. Mappen hedder stadig `LejrbaletSync`, så eksisterende data og karaktertilknytninger bevares.

## Installation
Luk WoW. Pak LejrbaletSync-Addon.zip ud i Interface/AddOns, så stien bliver Interface/AddOns/LejrbaletSync/LejrbaletSync.toc. Aktivér **Lejrbalet Companion** i AddOns-menuen. Installér også Lejrbalet Sync 0.5 på Windows eller Mac og forbind den på /sync.

## Hvad addonet kan
- **/lejrbalet** åbner vinduet med fanerne Missioner, WANTED og Sync.
- **Missioner:** dagens tre screenshot-missioner, point og pointtavlen. "Tag screenshot" gemmer et billede i Screenshots-mappen; det afleveres på hubben. Missionerne udløber ved dansk midnat.
- **WANTED:** når en spiller fra bingobogen ses via target, mus, navneplade, gruppe, chat eller kamploggen, kommer der en raid-advarsel med lyd og historien i chatten. Højst én advarsel pr. spiller hvert 2. minut. Hævnede og arkiverede navne er ikke med. Navne af formen `Navn-Realm` matcher kun på den realm. Lyd og advarsler kan slås fra i fanen. `/lejrbalet test` viser en testadvarsel.
- **Sync:** level, XP, guld, sted, gear og professions gemmes som før. Ved level up spørger addonet, om det skal sende med det samme (genindlæser brugerfladen). Kan slås fra.

## Sådan flyder data
WoW-addons kan ikke gå på internettet. Derfor:
1. WoW skriver `SavedVariables/LejrbaletSync.lua` ved /reload eller log ud. Appen sender den til hubben.
2. Appen henter hvert 5. minut (og efter hver upload) missioner og WANTED-listen fra `/api/sync/companion` og skriver `Interface/AddOns/LejrbaletSync/HubData.lua`.
3. WoW indlæser `HubData.lua` ved login eller /reload. Knappen "Hent nye missioner" genindlæser.

Ingen guilddata, chat eller adgangskoder indsamles. Observationer af WANTED-spillere gemmes kun lokalt.

## Test
`lua5.1 addon/tests/capture.lua && lua5.1 addon/tests/companion.lua` kører addonet mod en simuleret klient. En rigtig spilsession skal stadig afprøves, især navneplader og kamploggen, som kan være begrænset i nyere klienter.
