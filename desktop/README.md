# Lejrbalet Windows Sync

Independent companion for our hub, reading FlockSync's local data. It contains no FlockSync source code and does not modify or redistribute that addon. Install the original addon from its official publisher.

## User setup
1. Install LejrbaletSync-Setup.exe (Windows 10/11 x64).
2. Open the hub's /sync page while logged in with your own Discord account.
3. Create a personal upload key; paste it into the app.
4. Choose the active Forever client root containing Interface and WTF. Click Gem og forbind.
5. Play each character with FlockSync enabled and onboarding complete; scan and reload/logout.
6. Once: open /import?source=app and approve each new character, linking to an existing own card or creating main/alt.
7. Subsequent saved scans update approved cards automatically. WoW must write the file; this is not continuous in-game telemetry.

Close hides the window to the tray. Double-click the tray icon to reopen; Afslut exits for this session. Uncheck Start automatisk med Windows to disable future login startup. Uncheck Upload automatisk to pause uploads while leaving the app running. Windows Task Manager Startup can also disable startup. The registry login item runs only when your user signs into Windows, not before sign-in.

No raw SavedVariables files, guild records, or chat are uploaded. Current supported fields: GUID, realm, name, class, level, timestamp, recognised English primary/secondary professions and skill levels, equipped gear (slot, item ID and item link). Settings in %LOCALAPPDATA%\LejrbaletSyncData; upload credential protected for your Windows user. Revocation through /sync stops future server writes. Uninstall removes local settings/startup entry; revoke the device in the hub as well to invalidate the server credential.

## Build
.NET 10 SDK. `dotnet run --project desktop/ParserChecks -c Release` checks the independent parser on any OS.
`dotnet publish desktop/LejrbaletSync -c Release -o desktop/publish --self-contained true` cross-publishes win-x64.
NSIS 3: `makensis desktop/installer.nsi`. The GitHub Windows workflow also builds and publishes the installer.

## Verification limits
No real player file has been supplied yet. Automated tests use representative SavedVariables fixtures based on documented fields. Before broader rollout, test on Windows: install, no runtime dependency, token DPAPI persistence, folder selection, a real reload/logout, main/alt approval, offline retry, tray close/reopen, login startup, pause/resume, disabling startup and uninstall. Validate that newer levels journal once, colours/roles/notes survive, stale files do not lower levels, and revoked keys stop uploads. Never describe this checklist as passed until performed.

## 0.4.0: vores eget addon
Installér Lejrbalet Sync-addonet og brug /lejrbalet. Klienterne foretrækker LejrbaletSync.lua pr. konto og bruger ellers FlockSync.lua som overgang. GUID og realm bevarer de eksisterende karaktertilknytninger. Guld, XP og sidste position er med i de validerede data. Klienterne får fælles lejrbålsikon og mørkt/orange design. Installation erstatter programmet, men bevarer den eksisterende forbindelsesnøgle og konto.
