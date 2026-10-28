# Lejrbalet · Vercel

Komplet Next.js-app med Supabase PostgreSQL, e-maillogin og privat billedlagring.

**Begynd med [START-HER.md](START-HER.md)** — den indeholder opsætning, nøgler, deployment og opdateringer.

```sh
npm ci
# Udfyld .env.local fra .env.example og opret Supabase-tabellerne.
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
```

Denne pakke er en separat Vercel-udgave. Den ændrer ikke den eksisterende ChatGPT Site og indeholder ikke dens brugerdata eller hemmeligheder. ChatGPT-login er erstattet af verificeret e-maillogin; gamle profiler kan knyttes med administratorudstedte engangskoder.
