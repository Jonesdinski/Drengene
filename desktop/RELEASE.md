Armory update (0.3.0), Windows x64 build of Lejrbalet Sync.

- Watches only your selected WoW client's per-account FlockSync.lua files.
- Filters to characters in that local account's accountCharacters registry.
- Uploads basic character fields, equipped gear (slot, item ID, item link), and profession skill levels to https://lejrbalet-vercel.vercel.app.
- Requires a personal, revocable upload key from /sync. No Discord password is entered in the desktop app.
- New characters require approval on /import?source=app. Linked characters update automatically.
- Starts with Windows, hidden in the tray. Startup and automatic upload can be disabled independently.
- Per-user installer and uninstaller; no administrator rights required. Self-contained .NET 10 runtime included.
- Upload key encrypted using Windows DPAPI for the current Windows user.

This first build is unsigned. The parser and server ownership/revocation logic have automated tests. Building the executable does not establish live WoW compatibility: a real FlockSync file and a clean Windows installation/startup/tray/uninstall test are still required. Do not disable Windows security protections to install it.
