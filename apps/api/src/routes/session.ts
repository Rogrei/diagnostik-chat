// apps/api/src/routes/session.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";

const startBody = z.object({
  customerName: z.string().min(1).optional(),
  company: z.string().optional(),
  consentMethod: z.enum(["ui", "voice"]).default("ui"),
  accept: z.boolean(), // måste vara true
});

const endBody = z.object({
  sessionId: z.string().min(5).optional(),
  interviewId: z.string().uuid().optional(),
});

function randomSessionId() {
  return `sess_${Math.random().toString(36).slice(2, 10)}`;
}

export async function registerSessionRoutes(app: FastifyInstance) {
  // Starta en intervju-session
  app.post("/api/session/start", async (req, reply) => {
    const body = startBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });
    if (!body.data.accept) return reply.code(400).send({ error: "Consent is required" });

    const { customerName, company, consentMethod } = body.data;
    const sessionId = randomSessionId();

    const sql = `
      insert into interviews (session_id, customer_name, company, consent_at, started_at, status, consent_method)
      values ($1, $2, $3, now(), now(), 'active', $4)
      returning id, session_id as "sessionId", status, started_at as "startedAt"
    `;
    const rows = await query<{ id: string; sessionId: string; status: string; startedAt: string }>(sql, [
      sessionId,
      customerName ?? null,
      company ?? null,
      consentMethod,
    ]);

    // 🟢 Returnera även interviewId
    return reply.send({
      interviewId: rows[0].id,
      sessionId: rows[0].sessionId,
      status: rows[0].status,
      startedAt: rows[0].startedAt,
      serverStart: new Date().toISOString() // <-- 🔥 gemensam referenstid (serverns "nu")
    });
  });

  // Avsluta en intervju-session
  app.post("/api/session/end", async (req, reply) => {
    const body = endBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });

    let whereSql = "";
    let whereParam: string | null = null;
    if (body.data.interviewId) {
      whereSql = `id = $1`;
      whereParam = body.data.interviewId;
    } else if (body.data.sessionId) {
      whereSql = `session_id = $1`;
      whereParam = body.data.sessionId;
    } else {
      return reply.code(400).send({ error: "Provide interviewId or sessionId" });
    }

    const sql = `
      update interviews
      set ended_at = now(), status = 'ended'
      where ${whereSql} and status <> 'ended'
      returning id, session_id as "sessionId", status, ended_at as "endedAt"
    `;
    const rows = await query(sql, [whereParam]);
    if (rows.length === 0) return reply.code(404).send({ error: "Interview not found or already ended" });

    return reply.send(rows[0]);
  });

   // Hämta en intervju-session (status mm)
  app.get("/api/session/:sessionId", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };

    const sql = `
      select id, session_id as "sessionId", status,
             consent_at as "consentAt", started_at as "startedAt", ended_at as "endedAt"
      from interviews
      where session_id = $1
    `;
    const rows = await query(sql, [sessionId]);

    if (rows.length === 0) {
      return reply.code(404).send({ error: "Interview not found" });
    }

    return reply.send(rows[0]);
  });

  // Lista alla sessions + antal turns
  app.get("/api/sessions", async () => {
    const rows = await query(
      `
      SELECT i.id,
             i.session_id,
             i.status,
             i.consent_at,
             i.started_at,
             i.ended_at,
             COUNT(t.id) as turns_count
      FROM interviews i
      LEFT JOIN turns t ON t.session_id = i.session_id
      GROUP BY i.id, i.session_id, i.status, i.consent_at, i.started_at, i.ended_at
      ORDER BY i.started_at DESC
      `
    );
    return rows;
  });
}
