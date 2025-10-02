// apps/api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { signRealtimeJwt } from "./lib/jwt.js";

const app = Fastify({ logger: true });

// registrera CORS så frontend kan prata med API:t
await app.register(cors, { origin: true });

// Health check
app.get("/health", async () => ({ status: "ok" }));

// Stub: realtime token
app.post("/api/realtime/token", async (req, reply) => {
  if (!env.REALTIME_PRIVATE_KEY_BASE64) {
    return reply.code(500).send({ error: "Realtime private key not configured" });
  }

  const token = await signRealtimeJwt({
    issuer: env.REALTIME_ISSUER,
    privateKeyBase64: env.REALTIME_PRIVATE_KEY_BASE64
  });

  return reply.send({ token });
});

// Stub: start interview session (GET för snabb test, POST för frontend)
async function startSessionHandler(req: any, reply: any) {
  const sessionId = `sess_${Math.random().toString(36).slice(2, 10)}`;
  return reply.send({ sessionId });
}

app.get("/api/session/start", startSessionHandler);
app.post("/api/session/start", startSessionHandler);

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
