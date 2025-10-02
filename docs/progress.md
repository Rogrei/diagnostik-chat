# Diagnostik-chat Pilot-MVP – Progress

## ✅ Avklarat (M1 Foundations)
- Repo & monorepo-struktur med Turbo/PNPM
- Next.js frontend scaffold (`apps/web`)
- Fastify API scaffold (`apps/api`)
- Supabase-projekt skapat (region: eu-north-1, Stockholm)
- DB-anslutning via Pooler (IPv4, SSL)
- Helper (`db.ts`) för queries
- `.env`-konfiguration (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
- `POST /api/interviews` – sparar kundintervjuer i Supabase
- `GET /api/interviews` – listar alla intervjuer
- M1 Foundations – migrationssystem
- packages/db/sql/ innehåller versionerade SQL-filer
- apps/api/src/scripts/migrate.ts kör dem automatiskt mot Supabase
Tabell migrations i databasen loggar vilka som redan körts

## 🚧 Pågående
- Städa upp environment-hantering (flytta ut allt känsligt till `.env`)
- Sätta upp CI/CD (GitHub Actions) med byggtester

## ⏭️ Nästa steg
### M2
- Bygga realtidsintervjun (OpenAI Realtime API/WebRTC)
- Hantera consent (samtycke), statusflöde (started → ended)

### M3
- UI i Next.js (frontend: start intervju, visa resultat)
- Auth och enklare adminpanel

### M4
- Deploy till Vercel (frontend) och Railway/Fly.io (API)
