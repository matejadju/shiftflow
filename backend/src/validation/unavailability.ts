import { z } from "zod";
import { isValidDate } from "../lib/shift-time.js";

export const createUnavailabilitySchema = z
  .object({
    date: z.string().refine(isValidDate, {
      message: "Datum mora biti veljaven in v obliki YYYY-MM-DD."
    }),
    startTime: z.string().regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
      "Ura mora biti v obliki HH:mm."
    ),
    endTime: z.string().regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
      "Ura mora biti v obliki HH:mm."
    )
  })
  .strict()
  .refine((value) => value.endTime > value.startTime, {
    message: "Konec nerazpoložljivosti mora biti po začetku.",
    path: ["endTime"]
  });

export const unavailabilityIdSchema = z.string().uuid();