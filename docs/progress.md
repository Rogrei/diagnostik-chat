# Diagnostik-chat Pilot-MVP – Progress

## ✅ Avklarat (M1 Foundations)
- Repo & monorepo-struktur med Turbo/PNPM  
- Next.js-frontend scaffold (`apps/web`)  
- Fastify-API scaffold (`apps/api`)  
- Supabase-projekt (region: eu-north-1, Stockholm)  
- DB-anslutning via Pooler (IPv4, SSL)  
- Helper (`db.ts`) för queries  
- `.env`-konfiguration (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)  
- `POST /api/interviews` – sparar kundintervjuer i Supabase  
- `GET /api/interviews` – listar alla intervjuer  
- M1 Foundations – migrationssystem  
- `packages/db/sql/` innehåller versionerade SQL-filer  
- `apps/api/src/scripts/migrate.ts` kör dem automatiskt mot Supabase  
- Tabell `migrations` i databasen loggar vilka som redan körts  

---

## ✅ Avklarat (M2 – Realtime-intervju & Transkript)
- Samtyckesflöde (`/consent`) med *Ja / Nej* och session-start via API  
- Session-hantering:  
  - `POST /api/session/start`, `POST /api/session/end`, `GET /api/session/:id`  
  - Skapar rad i tabellen `interviews` med `consent_at`, `started_at`, `ended_at`  
- Realtidsintervju (`/interview`) kopplad till **OpenAI Realtime API (WebRTC)**  
  - Mikrofon → AI-röst → Text  
  - Full duplex-kommunikation (svenska)  
  - Realtidshändelser (`response.audio_transcript.delta`, `done`) byggs till löpande text  
- Live-transkription i UI  
- Fixar för Next.js 15 (`<Suspense>` kring `useSearchParams`)  
- `pnpm build` fungerar utan fel  
- Rapport **M2 – Realtime.md** skapad under `/docs`  

---

## ✅ Avklarat (M2.1 – Whisper-Transkribering & Recorder)
- `Recorder.tsx` spelar in ljud via `MediaRecorder`  
  - Skickar chunkar till `/api/transcribe/chunk` var 5:e sekund  
- `/api/transcribe/chunk` implementerad  
  - Tar emot multipart-upload  
  - Använder **OpenAI Whisper (`whisper-1`)**  
  - Språk: svenska (`language: "sv"`)  
  - Returnerar text + `audio_url`  
- Ny tabell `turns`:  
  - `id`, `interview_id`, `speaker`, `text`, `audio_url`, `started_at`, `ended_at`, `created_at`  
- CORS & multipart-konfiguration för Fastify v4  
- Manuella tester via PowerShell + DevTools  

---

## ✅ Avklarat (M2.2 – Admin & Dialogvisning)
- Ny adminvy `/admin/interviews`  
  - Hämtar via `/api/interviews`  
  - Visar kund, företag, status, start/slut-tid och antal turns  
  - Länk till fullständig dialog  
- Backend-route `/api/interviews` med `turn_count` (JOIN turns)  
- Ny adminvy `/admin/turns/[id]`  
  - Renderar dialogen i chattformat (user vänster / AI höger)  
  - Ljudklipp kan spelas upp direkt  
  - Knapp “🔁 Transkribera igen” via `/api/transcribe/retry/:turnId`  
- `Recorder` och Realtime-flöde testade parallellt  

---

## ✅ Avklarat (M2.3 – Segment-baserad transkribering)
- `/api/transcribe/full` uppdaterad med `response_format: "verbose_json"`  
  - Varje ljudsegment från Whisper innehåller `text`, `start`, `end`  
  - Tidskoder används för att placera meningar rätt i dialogen  
  - Inserter använder `(SELECT started_at FROM interviews)` + `interval '${segStart} seconds'`  
- Backend stöd för retry-transkribering per turn:  
  - `/api/transcribe/retry/:turnId`  
  - Raderar gamla segment → kör om Whisper → återskapar turns  
- Visuella förbättringar:  
  - Segment separeras i UI  
  - Tidsstämplar (start–end) visas  
  - User-kommentarer sorteras i kronologisk ordning  

---

## 🚧 Pågående
- Finjustering av synk mellan AI- och user-turns (sub-sekundprecision)  
- Stöd för att visa intervjutidslinje i realtid  
- Utvärdering av *Whisper timestamps* vs *Realtime partials*  
- Hantering av större ljudfiler (> 50 MB) i `multipart`  
- CI/CD - tester för API-rutter  

---

## ⏭️ Nästa steg
### M3 – Analys & Rapport
- Logisk sammanslagning av AI + User turns i kronologisk ordning  
- Export till Markdown / PDF / JSON  
- UI för att visa segmenterad analys och nyckelteman  
- Rollbaserad auth (admin / handledare / gäst)

### M4 – Deploy & Drift
- Deploy till Vercel (frontend)  
- Deploy till Railway (API)  
- Automatisk migrationshantering vid deploy  
- Loggning & monitorering i produktion


