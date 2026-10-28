# Lejrbalet til Vercel — start her

Pakken er et komplet Next.js-projekt med den eksisterende fantasy-stil og et fungerende server-API. Kodeopdateringer sker i GitHub og udgives via Vercel. Data og billeder ligger permanent i Supabase.

**Der er ikke oprettet en Vercel- eller Supabase-konto, og pakken er ikke udgivet til Vercel.** Du forbinder selv dine konti og indsætter deres nøgler. Den eksisterende ChatGPT Site fortsætter uændret.

## 1. Opret Supabase

1. Opret et projekt på https://supabase.com/dashboard.
2. Åbn **SQL Editor**. Kør indholdet af `database/001_schema.sql`, derefter `database/002_storage.sql`.
3. Under projektets API-indstillinger kopierer du projektets URL, publishable key og service_role key.
4. Under **Connect** kopierer du **Session pooler**-forbindelsen (port 5432). Sæt dit databasekodeord ind, og URL-encode specialtegn i kodeordet.
5. Under **Authentication** aktivér e-mail-login. Konfigurér **custom SMTP** til vennernes adresser. Supabases standardafsender har begrænsninger og er ikke en almindelig produktionsmailtjeneste. Du kan bruge en e-mailudbyder efter eget valg.

Tabellerne ligger i det private skema `lejrbalet`. Ingen browseradgang via Supabases Data API. RLS er aktiveret uden browserpolitikker. API-ruterne verificerer login og ejerskab på serveren. Storage-bucket `lejrbalet` skal forblive privat.

## 2. Læg koden i GitHub

1. Pak ZIP-filen ud.
2. Opret et nyt, privat GitHub-repository.
3. Upload **indholdet af mappen `lejrbalet-vercel`**, så `package.json` ligger i repository-roden. Medtag `.env.example` og `.gitignore`.
4. Upload aldrig `.env.local`, nøgler, `node_modules` eller `.next`.

Du kan også åbne mappen i en kodeeditor og bruge almindelig Git.

## 3. Importér i Vercel

1. Vælg **Add New → Project → Import Git Repository**.
2. Vælg repository og framework **Next.js**. Root Directory er repository-roden. Node-version: **22.x**.
3. Tilføj disse Environment Variables fra `.env.example`:

| Navn | Værdi |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase-projektets URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Supabase publishable key (en ældre anon key kan også bruges) |
| DATABASE_URL | Supabase Session pooler URL med kodeord |
| SUPABASE_SERVICE_ROLE_KEY | Hemmelig service_role key, kun server |
| LEJRBAL_ADMIN_EMAIL | Din verificerede loginadresse; giver adgang til import og Discord-indstillinger |
| APP_URL | Din fulde Vercel-produktionsadresse uden afsluttende skråstreg |
| ALLOWED_EMAILS | Valgfrit: kommasepareret liste med vennernes e-mailadresser |

Hvis Vercel-adressen først bliver kendt efter første deployment, indsæt den i `APP_URL` bagefter og vælg **Redeploy**. Brug et separat Supabase-projekt til forhåndsvisninger, hvis de skal kunne skrive testdata. Undgå at lade tilfældige preview-udgivelser skrive til produktionsdatabasen.

Når `ALLOWED_EMAILS` er tom, kan alle med en verificeret loginadresse deltage og se fælles indhold. Udfyld listen, hvis hubben kun er til din vennegruppe. Administratoradressen er altid tilladt. E-mails vises ikke på spillerkort.

## 4. Indstil loginadresser i Supabase

Under **Authentication → URL Configuration**:

- Site URL: din faktiske Vercel-adresse, fx `https://dit-projekt.vercel.app`.
- Redirect URLs: `https://dit-projekt.vercel.app/auth/callback` og `http://localhost:3000/auth/callback`, hvis du udvikler lokalt.
- Ved eget domæne: opdatér `APP_URL`, Site URL og Redirect URLs til det domæne.

Du kan bruge standardmailens login-link. Det anvender PKCE og skal normalt åbnes i den browser, som bad om linket.

**Anbefalet for login på tværs af enheder:** Under **Email Templates → Magic Link** indsæt denne knap:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Tag plads ved Lejrbalet</a>
```

Ruten `/auth/confirm` verificerer engangstokenet på serveren og opretter sessionen. Mail-linket er en adgangsnøgle til kontoen; del det ikke med andre.

## 5. Første kontrol efter deployment

- Log ind med din egen e-mail, og vælg spillernavn på profilsiden.
- Log ind igen: samme profil skal komme tilbage.
- Under **Discord & indstillinger** skal du som administrator kunne se importfunktionen.
- Opret et mål, en afstemning og en spilaften. Lad en ven svare fra en anden konto/enhed.
- Del et billede, genindlæs siden, og kontrollér, at det stadig findes.
- Kontrollér, at vennen ikke kan arkivere dit opslag.
- Skift dit spillernavn og kontrollér historik og ejerskab.

## 6. Sådan opdaterer du fremover

Ret koden i GitHub og commit/push til produktionsgrenen. Det forbundne Vercel-projekt bygger og udgiver automatisk ændringen. Databasen og billederne bliver bevaret ved nye deployments.

- Design og layout: `app/globals.css` og `app/hub.tsx`.
- Funktioner og rettigheder: `app/api/hub/route.ts` og `app/server.ts`.
- Login: `app/auth.ts`, `proxy.ts`, `app/auth/` og `app/api/auth/login/`.
- Billeder: `app/api/upload/route.ts` og `app/api/media/[id]/route.ts`.
- Nye databaseændringer: tilføj en ny SQL-fil i `database/` og anvend den før den afhængige kode udgives. Overskriv ikke eksisterende data.

## Hvad følger med — og hvad gør ikke?

Samme banner og design, profiler, karakterer, spilaftener/tilmelding, WANTED, mål, afstemninger, kro/beskeder, reaktioner, screenshots, loot, lodtrækningshjul, rejsejournal, arkiv/gendannelse og sikker import med engangskoder følger med.

**ChatGPT Sites-login følger ikke med til Vercel.** Denne udgave bruger e-maillogin fra Supabase, med stabilt internt bruger-ID. Den stoler aldrig på Sites-identitetsheaders, som en besøgende selv kan sende til Vercel.

**Ingen eksisterende brugerdata eller uploads er eksporteret fra Sites.** Pakken indeholder kun kode og det offentlige bannerbillede. Gamle navne og opslag kan importeres via administratorens importfunktion, når du har et verificeret eksportgrundlag. Identiteter må ikke automatisk kobles ud fra spillernavn eller gamle e-mailfelter. Billeder fra den gamle database skal overføres og deres referencer opdateres særskilt.

Uploads er begrænset til **4 MB** (JPG/PNG/WebP), så de kan gå gennem Vercels API. Billederne ligger i en privat Supabase-bucket og vises via kortlivede links efter login.

## Lokal udvikling og kontrol

Installér Node.js 22. Kopiér `.env.example` til `.env.local`, udfyld værdierne, og kør:

```sh
npm ci
npm run db:migrate
npm run dev
```

Hvis databasen allerede er opsat i SQL Editor, spring `db:migrate` over. Åbn `http://localhost:3000`.

```sh
npm run typecheck
npm test
npm run build
```

Pakken er kontrolleret med TypeScript, produktionsbuild og PostgreSQL-integrationstests i en isoleret PGlite-database. Testene kontrollerer bl.a. stabile identiteter, deling, ejerskab, CSRF, stemmer, tilmelding, engangskoder, privat information og rollback. De kontrollerer også verificeret login og beskyttelse mod eksterne returadresser. Rigtig maillevering, eksterne Supabase-forbindelser og den endelige Vercel-udgivelse skal afprøves efter kontoopsætning.

## Dokumentation

- Vercel/Git: https://vercel.com/docs/git
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- E-maillogin: https://supabase.com/docs/guides/auth/auth-email-passwordless
- SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Privat storage: https://supabase.com/docs/guides/storage/serving/downloads
- Vercel request-grænser: https://vercel.com/docs/functions/limitations

Postgres.js bruger pipelining. Derfor bruges Session pooler (5432), ikke shared transaction pooler (6543), som kan lade queries hænge. Appens connection pool er begrænset til én forbindelse pr. serverinstans.
