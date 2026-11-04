import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32)
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Neveljavne okoljske spremenljivke:",
    result.error.flatten().fieldErrors
  );

  process.exit(1);
}

export const config = result.data;