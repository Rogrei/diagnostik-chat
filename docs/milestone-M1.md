# 📑 Rapport – Milstolpe M1: Foundations  

## 🎯 Syfte
M1 (Foundations) handlade om att lägga grunden för projektet **Diagnostik-chat Pilot-MVP**:  
- Repo och kodstruktur  
- API och databas  
- CI/CD för automatiska tester  
- Dokumentation  

Detta ger en stabil bas för vidare utveckling i M2 (Realtime med OpenAI + WebRTC).  

---

## ✅ Leveranser i M1

### 1. **Repo & Monorepo-struktur**
- Turborepo + pnpm workspaces satt upp.
- apps/web → Next.js 15 frontend.
- apps/api → Fastify-baserat API i TypeScript.
- packages/shared → gemensam kod (typer, utils).
- packages/db/sql → databas-migrationer.

### 2. **Grundläggande API**
- `GET /health`
- `POST /api/interviews`
- `GET /api/interviews`
- `GET /api/interviews/:id` (validerad UUID)

Validering sker med **Zod**. JWT-signering scaffoldad för framtida OpenAI Realtime.

### 3. **Databas (Supabase Postgres)**
- Projekt skapat (region: eu-north-1, Stockholm).
- Anslutning via Session Pooler (SSL).
- `.env`-konfiguration satt upp.
- Migration `0001_init.sql` skapat tabellen `interviews`.

Kolumner: `id, session_id, customer_name, company, consent_at, started_at, ended_at, status, notes`.

### 4. **CI/CD (GitHub Actions)**
- Pipeline körs vid push till `main`.
- Steg: install, typecheck, build, lint, test.
- ESLint konfigurerat i apps/web.
- Vitest mock-tester för API (`health`, `interviews`, `interviews/:id`).
- Alla tester mockar DB (`query`).

### 5. **Dokumentation**
- README.md → projekt, installation, DB-struktur, status.
- docs/ci.md → detaljerad CI/CD-dokumentation.
- README länkar till CI/CD-dokumentationen.

---

## 🚀 Status M1
- Alla delmål uppnådda ✅
- CI/CD grönt
- API, DB och dokumentation redo för nästa fas.

---

## ⏭️ Nästa steg (M2 – Realtime)
- Koppla **OpenAI Realtime API**.
- Implementera **WebRTC** i frontend.
- Spara samtalsmetadata i DB (`status: started → ended`, `consent_at`).
- Definiera intervjuflödet.

---

📌 **Sammanfattning för utvecklare**  
- Starta API: `pnpm --filter @diagnostik/api dev`  
- Starta frontend: `pnpm --filter @diagnostik/web dev`  
- Skapa, lista och hämta intervjuer via API  
- CI/CD säkerställer att build/typecheck/test är grönt