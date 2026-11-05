import { z } from "zod";

export const createSwapRequestSchema = z
  .object({
    shiftId: z.string().uuid(),
    recipientId: z.string().uuid()
  })
  .strict();