// apps/api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { query } from "./db.js";
import { registerSessionRoutes } from "./routes/session.js";
import { registerTranscriptRoutes } from "./routes/transcripts.js";

const app = Fastify({ logger: true });

// Registrera CORS så frontend (Next.js) kan prata med API:t
await app.register(cors, {
  origin: true,       // tillåt alla origins (under dev)
  credentials: true   // viktigt för att stödja cookies/credentials
});

// Health check
app.get("/health", async () => ({ status: "ok" }));

// Realtime token (MVP: returnerar bara env-key)
app.post("/api/realtime/token", async (req, reply) => {
  if (!env.OPENAI_API_KEY) {
    return reply.code(500).send({ error: "OPENAI_API_KEY not configured" });
  }
  return reply.send({ token: env.OPENAI_API_KEY });
});

// Enkel test-route för DB
app.get("/api/test-db", async () => {
  const rows = await query("SELECT NOW()");
  return { now: rows[0].now };
});

// Registrera våra routes
await registerSessionRoutes(app);
await registerTranscriptRoutes(app);

// Starta servern
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
