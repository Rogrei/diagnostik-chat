// apps/api/src/index.ts
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { signRealtimeJwt } from "./lib/jwt.js";
import { query } from "./db.js";
import { z } from "zod";

const app = Fastify({ logger: true });

// registrera CORS så frontend kan prata med API:t
await app.register(cors, { origin: true });

// Health check
app.get("/health", async () => ({ status: "ok" }));

// Stub: realtime token
app.post(
  "/api/realtime/token",
  async (req: FastifyRequest, reply: FastifyReply) => {
    if (!env.REALTIME_PRIVATE_KEY_BASE64) {
      return reply
        .code(500)
        .send({ error: "Realtime private key not configured" });
    }

    const token = await signRealtimeJwt({
      issuer: env.REALTIME_ISSUER,
      privateKeyBase64: env.REALTIME_PRIVATE_KEY_BASE64,
    });

    return reply.send({ token });
  }
);

app.get("/api/test-db", async (req: FastifyRequest, reply: FastifyReply) => {
  const rows = await query("SELECT NOW()");
  return { now: rows[0].now };
});

// Stub: start interview session (GET för snabb test, POST för frontend)
async function startSessionHandler(req: FastifyRequest, reply: FastifyReply) {
  const sessionId = `sess_${Math.random().toString(36).slice(2, 10)}`;
  return reply.send({ sessionId });
}

app.get("/api/session/start", startSessionHandler);
app.post("/api/session/start", startSessionHandler);

// ✅ Ny route: skapa interview
const InterviewSchema = z.object({
  customer_name: z.string().min(1),
  session_id: z.string().optional(),
});

// härleder TypeScript-typ från Zod-schema
type InterviewInput = z.infer<typeof InterviewSchema>;

app.post(
  "/api/interviews",
  async (
    req: FastifyRequest<{ Body: InterviewInput }>,
    reply: FastifyReply
  ) => {
    try {
      const body = InterviewSchema.parse(req.body);

      const sessionId =
        body.session_id ?? `sess_${Math.random().toString(36).slice(2, 10)}`;

      const rows = await query(
        "INSERT INTO interviews (customer_name, session_id) VALUES ($1, $2) RETURNING *",
        [body.customer_name, sessionId]
      );

      return reply.code(201).send(rows[0]);
    } catch (err: any) {
      req.log.error(err);
      return reply.code(400).send({ error: err.message });
    }
  }
);

app.get(
  "/api/interviews/:id",
  async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    // validera med safeParse
    const parsed = InterviewParamsSchema.safeParse(req.params);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid interview id" });
    }

    try {
      const { id } = parsed.data;
      const rows = await query("SELECT * FROM interviews WHERE id = $1", [id]);

      if (rows.length === 0) {
        return reply.code(404).send({ error: "Interview not found" });
      }

      return reply.send(rows[0]);
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: "Unexpected error" });
    }
  }
);

// Schema + typ för params
const InterviewParamsSchema = z.object({
  id: z.string().uuid(),
});
type InterviewParams = z.infer<typeof InterviewParamsSchema>;

// Route för GET /api/interviews/:id
app.get(
  "/api/interviews/:id",
  async (req: FastifyRequest<{ Params: InterviewParams }>, reply: FastifyReply) => {
    try {
      const { id } = InterviewParamsSchema.parse(req.params);

      const rows = await query("SELECT * FROM interviews WHERE id = $1", [id]);

      if (rows.length === 0) {
        return reply.code(404).send({ error: "Interview not found" });
      }

      return reply.send(rows[0]);
    } catch (err: any) {
      req.log.error(err);
      return reply.code(400).send({ error: err.message });
    }
  }
);

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

