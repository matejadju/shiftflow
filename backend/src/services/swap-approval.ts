import { Prisma } from "../generated/prisma/client.js";
import {
  Role,
  ShiftStatus,
  SwapStatus
} from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { isShiftOverlapError } from "../lib/shift-conflict.js";

export class SwapDecisionError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SwapDecisionError";
    this.status = status;
  }
}

type Decision = "APPROVE" | "REJECT";

export async function decideSwap(
  requestId: string,
  decision: Decision
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const entry = await tx.swapRequest.findUnique({
            where: { id: requestId },
            include: {
              shift: true,
              recipient: {
                select: { role: true }
              }
            }
          });

          if (!entry) {
            throw new SwapDecisionError(
              404,
              "Zahteva za menjavo ne obstaja."
            );
          }

          if (entry.status !== SwapStatus.ACCEPTED) {
            throw new SwapDecisionError(
              409,
              "Odločate lahko samo o sprejeti zahtevi."
            );
          }

          if (decision === "REJECT") {
            const updated = await tx.swapRequest.updateMany({
              where: {
                id: requestId,
                status: SwapStatus.ACCEPTED
              },
              data: {
                status: SwapStatus.REJECTED
              }
            });

            if (updated.count !== 1) {
              throw new SwapDecisionError(
                409,
                "Stanje zahteve se je spremenilo. Osvežite seznam."
              );
            }

            return {
              id: requestId,
              status: SwapStatus.REJECTED
            };
          }

          const shift = entry.shift;

          if (
            shift.employeeId !== entry.requesterId ||
            shift.status !== ShiftStatus.PUBLISHED
          ) {
            throw new SwapDecisionError(
              409,
              "Izmena ni več objavljena ali dodeljena predlagatelju."
            );
          }

          if (entry.recipient.role !== Role.EMPLOYEE) {
            throw new SwapDecisionError(
              409,
              "Prevzemnik nima več vloge zaposlenega."
            );
          }

          const overlappingShift = await tx.shift.findFirst({
            where: {
              id: { not: shift.id },
              employeeId: entry.recipientId,
              date: shift.date,
              startTime: { lt: shift.endTime },
              endTime: { gt: shift.startTime }
            },
            select: { id: true }
          });

          if (overlappingShift) {
            throw new SwapDecisionError(
              409,
              "Prevzemnik ima v tem času že dodeljeno izmeno."
            );
          }

          const unavailability = await tx.unavailability.findFirst({
            where: {
              employeeId: entry.recipientId,
              date: shift.date,
              startTime: { lt: shift.endTime },
              endTime: { gt: shift.startTime }
            },
            select: { id: true }
          });

          if (unavailability) {
            throw new SwapDecisionError(
              409,
              "Prevzemnik je v izbranem času nerazpoložljiv."
            );
          }

          const updatedShift = await tx.shift.updateMany({
            where: {
              id: shift.id,
              employeeId: entry.requesterId,
              status: ShiftStatus.PUBLISHED
            },
            data: {
              employeeId: entry.recipientId
            }
          });

          if (updatedShift.count !== 1) {
            throw new SwapDecisionError(
              409,
              "Izmena se je spremenila. Osvežite seznam."
            );
          }

          const updatedRequest = await tx.swapRequest.updateMany({
            where: {
              id: requestId,
              status: SwapStatus.ACCEPTED
            },
            data: {
              status: SwapStatus.APPROVED
            }
          });

          if (updatedRequest.count !== 1) {
            // Izjema razveljavi tudi predhodno spremembo izmene.
            throw new SwapDecisionError(
              409,
              "Stanje zahteve se je spremenilo. Osvežite seznam."
            );
          }

          return {
            id: requestId,
            status: SwapStatus.APPROVED
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );
    } catch (error) {
      if (isShiftOverlapError(error)) {
        throw new SwapDecisionError(
          409,
          "Prevzemnik ima v tem času že dodeljeno izmeno."
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        if (attempt < 2) {
          continue;
        }

        throw new SwapDecisionError(
          409,
          "Podatki so se med odločanjem spremenili. Poskusite ponovno."
        );
      }

      throw error;
    }
  }

  throw new SwapDecisionError(
    409,
    "Odločitve ni bilo mogoče shraniti. Poskusite ponovno."
  );
}