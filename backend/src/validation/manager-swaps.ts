import { z } from "zod";

export const managerSwapIdSchema = z.string().uuid();

export const managerSwapDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"])
  })
  .strict();