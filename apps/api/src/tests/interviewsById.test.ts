import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import { query } from "../db.js";
import { z } from "zod";

// Mocka query-funktionen från db.ts
vi.mock("../db.js", () => ({
  query: vi.fn(),
}));

// Schema för params
const InterviewParamsSchema = z.object({
  id: z.string().uuid(),
});
type InterviewParams = z.infer<typeof InterviewParamsSchema>;

describe("GET /api/interviews/:id", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(cors, { origin: true });

    // Definiera samma route som i index.ts men utan DB-anslutning
    app.get(
        "/api/interviews/:id",
        async (
            req: FastifyRequest<{ Params: InterviewParams }>,
            reply: FastifyReply
        ) => {
            const parsed = InterviewParamsSchema.safeParse(req.params);

            if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid interview id" });
            }

            const { id } = parsed.data;
            const rows = await query("SELECT * FROM interviews WHERE id = $1", [id]);

            if (rows.length === 0) {
            return reply.code(404).send({ error: "Interview not found" });
            }

            return reply.send(rows[0]);
        }
    );
  });

  it("should return an interview if found", async () => {
    (query as any).mockResolvedValueOnce([
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        customer_name: "Anna",
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/api/interviews/123e4567-e89b-12d3-a456-426614174000",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty("customer_name", "Anna");
  });

  it("should return 404 if not found", async () => {
    (query as any).mockResolvedValueOnce([]);

    const response = await app.inject({
      method: "GET",
      url: "/api/interviews/123e4567-e89b-12d3-a456-426614174000",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Interview not found" });
  });

  it("should return 400 if id is not a valid uuid", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/interviews/not-a-uuid",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });
});
