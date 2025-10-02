import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  OPENAI_API_KEY: z.string().optional(),
  REALTIME_ISSUER: z.string().default("diagnostik-chat"),
  REALTIME_PRIVATE_KEY_BASE64: z.string().optional(),

  // 🔽 Ny struktur för databasen
  DB_HOST: z.string(),
  DB_PORT: z.string().default("6543"),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().default("postgres"),
});

export const env = EnvSchema.parse(process.env);
