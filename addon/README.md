# Lejrbalet Sync Addon 0.4.0
Originalt, selvstændigt addon til Lejrbalet-hubben. Ingen FlockSync-kode eller guild afhængighed.

Luk WoW. Pak LejrbaletSync-Addon.zip ud i Interface/AddOns, så stien bliver Interface/AddOns/LejrbaletSync/LejrbaletSync.toc. Aktivér Lejrbalet Sync i AddOns-menuen. Log ind på hver karakter. Åbn vinduet med /lejrbalet, tryk Scan min karakter, og brug /reload eller log ud.

Installér Lejrbalet Sync 0.4.0 på Windows eller Mac. Forbind din konto og vælg klientmappen med Interface og WTF. Appen finder SavedVariables/LejrbaletSync.lua automatisk. Tilknyt nye karakterer én gang på hubben; eksisterende GUID/realm-tilknytninger genbruges.

Gemmer navn, realm, klasse, level, XP, guld i kobber, sidste zone/underzone/tilgængelige koordinater, udstyret gear og kendte professionsniveauer. Professions genkendes på skill-ID, også ved andre spilsprog. Ingen guilddata, chat eller adgangskoder indsamles. UI og ikon bruger hubbens mørke træfarver og orange lejrbål.

Automatiske tests bruger simulerede WoW-API'er og fælles eksportfixtures. En rigtig spilsession skal stadig afprøves. Manglende eller beskyttede API-værdier udelades, og kendt gear/guld bevares ved utilgængelige logout-data. Lokation er et tidspunktbestemt øjebliksbillede, ikke live GPS. Filen gemmes af WoW ved normal reload/logout; tvungen proceslukning kan miste nye data.
