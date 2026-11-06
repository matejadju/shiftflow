import { z } from "zod";

export const createSwapRequestSchema = z
  .object({
    shiftId: z.string().uuid(),
    recipientId: z.string().uuid()
  })
  .strict();

export const swapRequestIdSchema = z.string().uuid();

export const respondToSwapRequestSchema = z
  .object({
    decision: z.enum(["ACCEPT", "REJECT"])
  })
  .strict();