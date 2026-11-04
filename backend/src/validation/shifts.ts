import { z } from "zod";
import {
  isValidDate,
  toDatabaseDate
} from "../lib/shift-time.js";

const dateSchema = z.string().refine(isValidDate, {
  message: "Datum mora biti veljaven in v obliki YYYY-MM-DD."
});

const timeSchema = z.string().regex(
  /^([01]\d|2[0-3]):[0-5]\d$/,
  "Ura mora biti v obliki HH:mm."
);

const weekStartSchema = dateSchema.refine(
  (value) =>
    isValidDate(value) &&
    toDatabaseDate(value).getUTCDay() === 1,
  {
    message: "Začetek tedna mora biti ponedeljek."
  }
);

export const createShiftSchema = z
  .object({
    employeeId: z.string().uuid(),
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema
  })
  .strict()
  .refine((value) => value.endTime > value.startTime, {
    message: "Konec izmene mora biti po začetku.",
    path: ["endTime"]
  });

export const weekQuerySchema = z
  .object({
    weekStart: weekStartSchema
  })
  .strict();

export const publishWeekSchema = z
  .object({
    weekStart: weekStartSchema
  })
  .strict();