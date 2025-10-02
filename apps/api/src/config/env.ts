import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  OPENAI_API_KEY: z.string().optional(),
  REALTIME_ISSUER: z.string().default("diagnostik-chat"),
  REALTIME_PRIVATE_KEY_BASE64: z.string().optional(),
  DATABASE_URL: z.string().url().optional()
});

export const env = EnvSchema.parse(process.env);
