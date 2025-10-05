// apps/api/src/routes/turns.ts
import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function registerTurnRoutes(app: FastifyInstance) {
  // 🔹 GET – hämta alla turns för en intervju i kronologisk ordning
  app.get("/api/turns/:interviewId", async (req, reply) => {
    const { interviewId } = req.params as { interviewId: string };
    try {
      const rows = await query(
        `SELECT id, interview_id, speaker, text, audio_url, started_at, ended_at, created_at, updated_at
         FROM turns
         WHERE interview_id = $1
         ORDER BY started_at ASC, created_at ASC`,
        [interviewId]
      );
      return reply.send(rows);
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: err.message });
    }
  });

  // 🔹 POST – spara AI-svar eller användarsvar
  app.post("/api/turns", async (req, reply) => {
    const { interviewId, speaker, text, started_at } = req.body as {
        interviewId?: string;
        speaker?: "user" | "ai";
        text?: string;
        started_at?: string;
    };

    if (!interviewId || !speaker || !text) {
        return reply.code(400).send({ error: "Missing interviewId, speaker or text" });
    }

    try {
    const [interview] = await query<{ started_at: string }>(
        "SELECT started_at FROM interviews WHERE id = $1",
        [interviewId]
    );
    if (!interview) return reply.code(404).send({ error: "Interview not found" });

    let finalStartedAt = started_at ? new Date(started_at) : new Date();

    // 🧩 1️⃣ Om det är användarens första turn – lägg på en liten fördröjning (+2s)
    if (speaker === "user") {
        const existingUserTurns = await query<{ count: string }>(
        "SELECT COUNT(*)::int AS count FROM turns WHERE interview_id = $1 AND speaker = 'user'",
        [interviewId]
        );
        if (parseInt(existingUserTurns[0].count, 10) === 0) {
        finalStartedAt = new Date(finalStartedAt.getTime() + 2000);
        }
    }

    // 🧩 2️⃣ Om det är AI:s första turn – lägg en liten förskjutning bakåt (−2s)
    // 🧩 2️⃣ Om det är AI:s första turn – håll den exakt som serverns tid
    if (speaker === "ai") {
    const existingAiTurns = await query<{ count: string }>(
        "SELECT COUNT(*)::int AS count FROM turns WHERE interview_id = $1 AND speaker = 'ai'",
        [interviewId]
    );
    if (parseInt(existingAiTurns[0].count, 10) === 0) {
        // logg endast för debug
        console.log("🧠 Första AI-turn upptäckt — ingen offset tillämpas");
    }
    }

    // 🧹 3️⃣ Rensa texten
    const cleanText = text.replace(/\[sätter en kort paus\]/gi, "").trim();

    // 🧱 4️⃣ Spara till databasen
    const [row] = await query(
        `INSERT INTO turns (interview_id, speaker, text, started_at, created_at)
        VALUES ($1, $2, $3, $4, now())
        RETURNING id, interview_id, speaker, text, started_at`,
        [interviewId, speaker, cleanText, finalStartedAt.toISOString()]
    );

    return reply.code(201).send(row);
    } catch (err: any) {
    req.log.error(err);
    return reply.code(500).send({ error: err.message });
    }
  });
}