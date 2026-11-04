import "dotenv/config";
import { z } from "zod";
import { createApp } from "./app.js";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173")
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Neveljavne okoljske spremenljivke:",
    result.error.flatten().fieldErrors
  );
  process.exit(1);
}

const environment = result.data;
const app = createApp(environment.FRONTEND_URL);

app.listen(environment.PORT, () => {
  console.log(
    `ShiftFlow API je dosegljiv na http://localhost:${environment.PORT}`
  );
});