# 📘 CI/CD-dokumentation – Diagnostik-chat Pilot-MVP  

## 🎯 Syfte
CI/CD-flödet är satt upp med **GitHub Actions** för att automatiskt:  
1. Installera dependencies  
2. Köra **typecheck** på alla workspaces  
3. Köra **build** på alla workspaces  
4. Köra **tester** på API:t  

---

## ⚙️ Vad som körs i GitHub Actions

### 1. **Typecheck**
- Kommandot `pnpm typecheck` kör `tsc --noEmit` i alla workspaces.  
- Säkerställer att inga TypeScript-fel ligger kvar.  

### 2. **Build**
- `pnpm build` körs via Turborepo.  
- Bygger alla projekt (`apps/web`, `apps/api`, `packages/shared`).  

### 3. **Tester**
- `pnpm --filter @diagnostik/api test` körs i CI.  
- Testerna körs med **Vitest**.  

### 4. **Mockade tester (utan DB)**
För att CI ska vara snabb och inte bero på en riktig Supabase-databas:  
- Vi har mockat DB-anrop (`query`) i testfilerna.  
- Detta gör att testerna körs helt isolerat från externa tjänster.  
- Vi testar endast **API-logik** och **validering**, inte riktiga queries.  

---

## ✅ Vad som testas just nu
1. `GET /health` → returnerar `{ status: "ok" }`  
2. `POST /api/interviews` → skapar en intervju (mock)  
3. `GET /api/interviews` → listar intervjuer (mock)  
4. `GET /api/interviews/:id` → hämtar en specifik intervju  
   - 200 om hittad  
   - 404 om ej hittad  
   - 400 om ogiltig UUID  

---

## 🔮 Vad som återstår
I kommande milstolpar (M2/M3) kan vi lägga till:
- **Integrationstester med riktig DB** (körs separat, inte i pull-requests).  
- **E2E-tester för frontend** (Next.js).  
- Deploy-workflow till Vercel (web) + Railway/Supabase (API).  

---

📌 **Teamets take-away**:  
- CI/CD-flödet garanterar att API:t alltid bygger och har fungerande logik innan merge.  
- Alla tester är just nu **mockade** för att hålla pipeline snabb och robust.  
- När vi når M2 kan vi introducera “riktiga” integrationstester mot Supabase i en staging-miljö.  

