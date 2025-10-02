// apps/api/src/scripts/migrate.ts
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { env } from "../config/env.js";

async function runMigrations() {
  const pool = new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Se till att migrations-tabellen finns
    await pool.query(`
      create table if not exists migrations (
        id serial primary key,
        filename text not null unique,
        applied_at timestamptz default now()
      );
    `);

    // 2. Läs alla migrationsfiler
    const migrationsDir = path.resolve(process.cwd(), "../../packages/db/sql");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`Found migrations:`, files);

    for (const file of files) {
      // 3. Kolla om denna migration redan är körd
      const check = await pool.query(
        "SELECT 1 FROM migrations WHERE filename = $1",
        [file]
      );

      if ((check.rowCount ?? 0) > 0) {
        console.log(`⏭ Skipping already applied: ${file}`);
        continue;
      }

      // 4. Kör migrationen
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, "utf-8");

      console.log(`\n▶ Running migration: ${file}`);
      await pool.query(sql);
      console.log(`✔ Done: ${file}`);

      // 5. Registrera i migrations-tabellen
      await pool.query(
        "INSERT INTO migrations (filename) VALUES ($1)",
        [file]
      );
    }

    console.log("\n✅ All migrations applied successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await pool.end();
  }
}

runMigrations();
