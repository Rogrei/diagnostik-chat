# Diagnostik-chat Pilot-MVP

## 📌 Projektbeskrivning
Diagnostik-chat är ett pilotprojekt för att utveckla en realtidsbaserad intervju-chat (röst + text) som hjälper till att analysera kunders behov och dokumentera resultat.  
Projektet byggs stegvis som en **Pilot-MVP** med tydliga milstolpar (M1–M4).

- **M1 (Foundations)**: repo, miljö, API, databas  
- **M2 (Realtime)**: OpenAI Realtime API + WebRTC  
- **M3 (Frontend & Admin)**: UI i Next.js + enklare adminpanel  
- **M4 (Deploy)**: Vercel (frontend) + Railway/Fly.io (API)

---

## 🏗️ Arkitektur
Projektet är organiserat som ett **monorepo** med [Turborepo](https://turbo.build/) och [pnpm workspaces](https://pnpm.io/workspaces).

diagnostik-chat/
├─ apps/
│ ├─ web/ # Next.js frontend (Next 15)
│ └─ api/ # Fastify API (Node.js/TypeScript)
├─ packages/
│ ├─ shared/ # Delad TypeScript-kod (types, utils)
│ └─ db/ # SQL migrations (framtida)
├─ docs/ # Projekt- och utvecklardokumentation
├─ turbo.json # Turborepo config
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md

yaml
Kopiera kod

---

## ⚙️ Installation & körning

### 1. Klona repo
```bash
git clone https://github.com/<ditt-repo>/diagnostik-chat.git
cd diagnostik-chat
2. Installera beroenden
bash
Kopiera kod
pnpm install
3. Starta frontend
bash
Kopiera kod
pnpm --filter @diagnostik/web dev
Körs på: http://localhost:3000

4. Starta API
bash
Kopiera kod
pnpm --filter @diagnostik/api dev
Körs på: http://localhost:3001

🔑 Environment-variabler
Skapa en .env i apps/api/.env:

env
Kopiera kod
# Database (Supabase – Session Pooler)
DB_HOST=aws-1-eu-north-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.ffrsdkrpiitnhuvkesie
DB_PASSWORD=SUPABASE_PASSWORD
DB_NAME=postgres

# Placeholder values för framtida steg
OPENAI_API_KEY=dummy
REALTIME_PRIVATE_KEY_BASE64=dummy
🗄️ Databas
Projektet använder Supabase (Postgres).
För M1 används en enkel tabell interviews.

Tabellstruktur (interviews)
kolumn	typ	beskrivning
id	uuid	Primärnyckel (auto)
session_id	text	Genereras i API
customer_name	text	Kundens namn
company	text	Företag (nullable)
consent_at	timestamptz	När kunden gav samtycke
started_at	timestamptz	När intervjun startade
ended_at	timestamptz	När intervjun avslutades
status	text	Standard "created"
notes	text	Fritext/anteckningar

✅ Avklarade steg (M1 Foundations)
Repo & monorepo-struktur (Turborepo + pnpm)

Next.js frontend scaffold (apps/web)

Fastify API scaffold (apps/api)

Supabase-projekt skapat (region: eu-north-1, Stockholm)

DB-anslutning via Pooler (SSL)

.env-konfiguration för DB

db.ts helper för queries

API-endpoints:

GET /health – health check

POST /api/interviews – skapa intervju (autogenererar session_id)

GET /api/interviews – lista alla intervjuer

GET /api/interviews/:id – hämta en specifik intervju (med validering)

🚧 Pågående
CI/CD via GitHub Actions (bygga & testa API/Web)

Flytta ut migrations till packages/db/sql

Städa environment-variabler

⏭️ Nästa steg
M2

Realtime-intervju via OpenAI Realtime API

Hantera consent-flöde

Status: started → ended

M3

Frontend UI för att starta/intervjua

Adminpanel för att se sparade intervjuer

M4

Deploy till Vercel (frontend)

Deploy till Railway/Fly.io (API)

👥 Utvecklarinfo
Editor: VS Code

Runtime: Node.js 20 (Vercel standard)

Pakethanterare: pnpm

Hosting: Supabase (DB), Vercel (frontend), Railway/Fly.io (API planerat)

🔗 Dokumentation
📘 CI/CD-dokumentation

yaml
Kopiera kod

---

### 📌 Commit-plan

1. Öppna `README.md` och uppdatera med sektionen **🔗 Dokumentation** längst ner.  
2. Lägg till ändringen:  
   ```powershell
   git add README.md
Commit:

powershell
Kopiera kod
git commit -m "docs: link CI/CD documentation from README"
Push:

powershell
Kopiera kod
git push
