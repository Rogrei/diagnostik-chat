// packages/db/run-migrations.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // laddar root .env.local explicit
import fs from "fs";
import path from "path";
import { Pool } from "pg";

console.log("DB ENV:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? "****" : undefined,
  db: process.env.DB_NAME
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  console.log(`🔗 Connecting to ${process.env.DB_HOST}/${process.env.DB_NAME}`);

  const sqlDir = path.join(process.cwd(), "packages/db/sql");
  const files = fs.readdirSync(sqlDir).filter(f => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(sqlDir, file), "utf-8");
    console.log(`➡️ Running migration: ${file}`);
    await pool.query(sql);
  }

  await pool.end();
  console.log("✅ All migrations applied");
}

runMigrations().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
