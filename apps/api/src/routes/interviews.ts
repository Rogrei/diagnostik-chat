// apps/api/src/routes/interviews.ts
import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function registerInterviewRoutes(app: FastifyInstance) {
  app.get("/api/interviews", async () => {
    const rows = await query(`
      SELECT i.*, COUNT(t.id) AS turn_count
      FROM interviews i
      LEFT JOIN turns t ON t.interview_id = i.id
      GROUP BY i.id
      ORDER BY i.started_at DESC
    `);
    return rows;
  });
}