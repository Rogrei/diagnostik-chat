// apps/api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import path from "path";

import { env } from "./config/env.js";
import { query } from "./db.js";

import { registerSessionRoutes } from "./routes/session.js";
import { registerTranscriptRoutes } from "./routes/transcripts.js";
import { registerTranscribeRoutes } from "./routes/transcribe.js";
import { registerTurnRoutes } from "./routes/turns.js";

const app = Fastify({ logger: true });

// --------------------
// 🔹 CORS
// --------------------
await app.register(cors, {
  origin: true,
  credentials: true,
});

// --------------------
// 🔹 Multipart (höjd gräns till 50 MB)
// måste registreras FÖRE routes som tar emot filer
// --------------------
await app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

// --------------------
// 🔹 Health check
// --------------------
app.get("/health", async () => ({ status: "ok" }));

// --------------------
// 🔹 Realtime token
// --------------------
app.post("/api/realtime/token", async (req, reply) => {
  if (!env.OPENAI_API_KEY) {
    return reply.code(500).send({ error: "OPENAI_API_KEY not configured" });
  }
  return reply.send({ token: env.OPENAI_API_KEY });
});

// --------------------
// 🔹 Test mot DB
// --------------------
app.get("/api/test-db", async () => {
  const rows = await query("SELECT NOW()");
  return { now: rows[0].now };
});

// --------------------
// 🔹 Lista intervjuer
// --------------------
app.get("/api/interviews", async (req, reply) => {
  try {
    const rows = await query("SELECT * FROM interviews ORDER BY started_at DESC");
    return reply.send(rows);
  } catch (err: any) {
    req.log.error(err);
    return reply.code(500).send({ error: "Unexpected error" });
  }
});

// --------------------
// 🔹 Registrera routes
// --------------------
await registerSessionRoutes(app);
await registerTranscriptRoutes(app);
await registerTranscribeRoutes(app);
await registerTurnRoutes(app);

// --------------------
// 🔹 Starta server
// --------------------
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
