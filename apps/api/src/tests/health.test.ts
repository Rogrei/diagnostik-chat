// apps/api/src/tests/health.test.ts
import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";

describe("Health endpoint", () => {
  it("should return { status: 'ok' }", async () => {
    const app = Fastify();
    await app.register(cors, { origin: true });

    app.get("/health", async () => ({ status: "ok" }));

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
