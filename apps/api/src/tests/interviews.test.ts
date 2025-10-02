// apps/api/src/tests/interviews.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import type { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import { query } from "../db.js";

// Mocka query-funktionen
vi.mock("../db.js", () => ({
  query: vi.fn(),
}));

describe("Interviews API", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(cors, { origin: true });

    // POST /api/interviews route (samma som i index.ts, men förenklad för test)
    app.post("/api/interviews", async (req: FastifyRequest, reply: FastifyReply) => {
      const body = req.body as any;

      // normalt skulle vi validera med zod → här kör vi enkelt
      if (!body.customer_name) {
        return reply.code(400).send({ error: "customer_name is required" });
      }

      const sessionId = body.session_id ?? "sess_mocked";

      // använd mockade query
      const rows = await query(
        "INSERT INTO interviews (customer_name, session_id) VALUES ($1, $2) RETURNING *",
        [body.customer_name, sessionId]
      );

      return reply.code(201).send(rows[0]);
    });
  });

  it("should create an interview with auto session_id", async () => {
    // Mocka query-respons
    (query as any).mockResolvedValueOnce([
      {
        id: "mocked-uuid",
        customer_name: "Test User",
        session_id: "sess_mocked",
      },
    ]);

    const response = await app.inject({
      method: "POST",
      url: "/api/interviews",
      payload: { customer_name: "Test User" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: "mocked-uuid",
      customer_name: "Test User",
      session_id: "sess_mocked",
    });
  });

  it("should fail if customer_name is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/interviews",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });
});
