// apps/api/src/routes/transcripts.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";

const TranscriptBody = z.object({
  sessionId: z.string().min(5),
  text: z.string().min(1),
});

export async function registerTranscriptRoutes(app: FastifyInstance) {
  app.post("/api/transcripts", async (req, reply) => {
    const body = TranscriptBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    const { sessionId, text } = body.data;

    const sql = `
      insert into transcripts (session_id, text, created_at)
      values ($1, $2, now())
      returning id, session_id as "sessionId", text, created_at as "createdAt"
    `;
    const rows = await query(sql, [sessionId, text]);

    return reply.code(201).send(rows[0]);
  });

  // Hämta alla transcripts för en session
  app.get("/api/transcripts/:sessionId", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };

    if (!sessionId) {
      return reply.code(400).send({ error: "sessionId is required" });
    }

    const sql = `
      select id, session_id as "sessionId", text, created_at as "createdAt"
      from transcripts
      where session_id = $1
      order by created_at asc
    `;
    const rows = await query(sql, [sessionId]);

    return reply.send(rows);
  });
}
