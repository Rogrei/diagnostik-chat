# Milstolpe M2 – Realtime-intervju, Transkribering & Dialoglagring

## Översikt
Milstolpe M2 levererar ett komplett realtidsflöde för diagnostiska intervjuer med **OpenAI Realtime API (WebRTC)** och **svensk röstinteraktion**.  
Systemet hanterar hela kedjan – från samtycke, mikrofonanslutning och Realtime-konversation till fullinspelning, transkribering (Whisper) och synkroniserad lagring av både AI- och användarturer i tabellen `turns`.

Fokus i denna milstolpe:
- Robust session- och samtyckesflöde  
- Realtidskommunikation med svensk taligenkänning  
- Automatisk transkribering av både realtids- och fullinspelning  
- Synkroniserad lagring av AI- och användarturer  
- Tydlig adminvy för efterhandsgranskning  

---

## Levererat i M2

### 🟢 Samtycke & Sessioner
- Sida **`/consent`** visar samtyckestext innan intervju startar.  
- Vid godkännande anropas `POST /api/session/start`, vilket skapar en ny post i tabellen `interviews`.  
- Servern returnerar `interviewId`, `sessionId` och `startedAt` (serverns tid).  
- Dessa värden sparas i `localStorage` och används på intervjusidan.  
- Samtyckesflödet fungerar helt utan separat “starta inspelning”-knapp – intervjun startar automatiskt efter samtycke.

---

### 🧠 Realtidsintervju (OpenAI Realtime API)
- Sida **`/interview`** initierar Realtime-session mot `gpt-4o-realtime-preview-2024-12-17` via WebRTC.  
- Användarens mikrofon aktiveras, och AI svarar med **röst och text** i realtid.  
- Händelser tolkas i DataChannel:
  - `response.audio_transcript.delta` → löpande transkription av användarens röst  
  - `response.audio_transcript.done` → färdigt användarsvar → lagras som turn (`speaker: "user"`)  
  - `response.output_item.done` → färdigt AI-svar → lagras som turn (`speaker: "ai"`)  
- Samtalet sker på **svenska** i båda riktningar.  
- Samtalet avslutas via knappen **"Avsluta intervju"**, som även laddar upp fullinspelningen.

---

### 🎙️ Recorder – helinspelning & Whisper-transkribering
- Komponent **`Recorder.tsx`** spelar in användarens mikrofon i bakgrunden via `MediaRecorder`.  
- När inspelningen stoppas (vid avslutad intervju) skickas hela ljudfilen till `/api/transcribe/full?interviewId=...`.  
- Backend använder **Whisper (`whisper-1`)** med `response_format: "verbose_json"` för att få segmentbaserad transkribering.  
- Varje segment sparas i tabellen `turns` med:
  - `speaker = 'user'`
  - `started_at = interviews.started_at + seg.start`
  - `ended_at = interviews.started_at + seg.end`
  - `text = seg.text` (rensad från pausmarkörer)
- Filer lagras temporärt i `os.tmpdir()` och får en `publicUrl` för uppspelning i adminvyn.

---

### 💬 Dialoghantering – Turns
Tabellen **`turns`** är central för dialoglagring:

```sql
id, interview_id, speaker, text, audio_url, started_at, ended_at, created_at, updated_at
```

- Varje AI-svar och användarreplik lagras med tydlig tidsstämpel (`started_at`).  
- Backend sanerar text (tar bort `[sätter en kort paus]`) innan lagring.  
- Klientens första `user-turn` får vid behov en liten offset (+2s) för att inte kollidera med AI:s introduktion.  
- API `/api/turns/:interviewId` returnerar turer i kronologisk ordning.  

---

### 🧩 Backend-funktioner

#### `/api/session/start`
Skapar ny `interviews`-post med `consent_at` och `started_at`.

#### `/api/turns`
- Hanterar både AI- och användarturer.  
- Tar emot `started_at` från frontend (ISO-format).  
- Om inget `started_at` anges används serverns tid.  
- AI-turns och user-turns sparas i kronologisk ordning baserat på `started_at`.

#### `/api/transcribe/full`
- Tar emot fullinspelning efter avslutad intervju.  
- Kör Whisper med segmentering och skapar rader i `turns` för varje segment.  
- Segmentens tider relateras till `interviews.started_at`.

---

### 🧭 Admin & Översikt
- **`/admin/interviews`**: lista över alla intervjuer med status, tidsstämplar och antal turns.  
- **`/admin/turns/[interviewId]`**: detaljerad chattvy:
  - AI = grön bubbla (höger)
  - User = blå bubbla (vänster)
  - Tidsangivelser visas utifrån `started_at`
  - Möjlighet att spela upp ljud via `<audio>`
  - Knapp **“🔁 Transkribera igen”** för om-transkribering av enskilt ljudsegment

---

### ⚙️ Synkronisering
- All tidslogik förankras i `interviews.started_at` (serverns klocka).  
- Realtime-turns (AI & user) lagras direkt vid `done`-event.  
- Whisper-turns (fullinspelning) justeras exakt mot intervjuns starttid.  
- Textsanering sker alltid innan insättning.  

| Källa | Tidsbas | Kommentar |
|--------|----------|------------|
| Realtime (AI/User) | Klienttid (ISO) → servern | Sker i realtid via API |
| Fullinspelning (Whisper) | Servern (`started_at + offset`) | Segmenttider justeras absolut |
| UI-sortering | `ORDER BY started_at ASC, created_at ASC` | Säkerställd kronologi |

---

### 🧱 Databasändringar
- **`interviews`** → `consent_at`, `started_at`, `ended_at`  
- **`turns`** → ny struktur med `speaker`, `text`, `audio_url`, `started_at`, `ended_at`  
- **`transcripts`** → löpande logg (för debug och analys)

---

## 🧪 Tester & Resultat

✅ Verifierat flöde:
1. Samtycke godkänns → `interview` startar  
2. AI hälsar välkommen (röst + text)  
3. Användaren svarar via mikrofon  
4. AI:s svar och användarens svar lagras i tabellen `turns`  
5. Vid avslut laddas fullinspelning upp och transkriberas med Whisper  
6. Adminvyn visar dialogen i korrekt ordning  
7. Retry-transkribering fungerar som avsett  

**Resultat:**  
Alla AI- och användarrepliker sparas nu i samma tråd, i synk.  
Endast de allra första två raderna i konversationen kan i vissa fall hamna i omvänd ordning (känd race condition).  

---

## 🚧 Kända begränsningar (M2)
- **Första AI-hälsningen och användarens första svar** kan byta plats tidsmässigt om användaren svarar mycket snabbt.  
  Detta beror på att `response.output_item.done` (AI-text) ibland kommer efter `response.audio_transcript.done` (user-text).  
- All övrig synkronisering är stabil.  
- Flera förbättringsspår finns dokumenterade i `docs/sync-notes.md`.

---

## ✅ Status
✅ **M2 är levererad, testad och verifierad lokalt**  
💬 Realtidsdialog, transkribering och synkroniserad lagring fungerar stabilt.  
🟡 Kvar: mindre justering av AI:s första hälsningstidpunkt.

---

## 🔮 Nästa steg (M3)
- Förfina startsekvensen (AI #1 vs User #1)
- Introducera “mic-gate” (fördröjd mikrofonaktivering)
- Exportfunktioner till **PDF**, **Markdown** och **JSON**
- Rapportgenerator för diagnostisk analys  
- Dashboard med statistik (antal turns, duration, ämnesklassificering)
- Förberedelse för fler språk (en/sv)

---

## 🧾 Sammanfattning
M2 utgör en stabil grund för diagnoschatens realtidskommunikation.  
Systemet kan redan idag användas i skarp testmiljö och utgör basen för vidareutveckling mot M3 där full semantisk analys och rapportgenerering tillkommer.

---

