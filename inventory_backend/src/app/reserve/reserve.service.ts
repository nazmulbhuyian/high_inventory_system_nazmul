import { Prisma } from "../../../generated/prisma/client.js";
import ApiError from "../../errors/ApiError.js";
import { prisma } from "../../lib/prisma.js";
import { emitStockUpdate } from "../../shared/socket.js";
import { IReserveInput, IReservationRow } from "./reserve.interface.js";

export class ReserveService {
  async createReservation(payload: IReserveInput): Promise<IReservationRow> {
    const prismaClient = prisma as any;

    let transactionResult:
      | {
          reservation: IReservationRow;
          drop: { id: number; available_stock: number };
        }
      | undefined;

    try {
      transactionResult = await prismaClient.$transaction(
        async (txClient: any) => {
        // Transaction flow (atomic):
        // 1) Lock target drop row (FOR UPDATE) to serialize stock updates.
        // 2) Reuse existing ACTIVE reservation for same user/drop (idempotent behavior).
        // 3) Decrement stock and create reservation with DB-time based 60s expiry.
        // If any step fails, everything is rolled back automatically.
        const lockedDropRows = (await txClient.$queryRaw(
          Prisma.sql`
            SELECT id, available_stock, start_time <= NOW() AS is_live
            FROM "Drop"
            WHERE id = ${payload.dropId}
            FOR UPDATE
          `
        )) as Array<{ id: number; available_stock: number; is_live: boolean }>;

        if (!lockedDropRows.length) {
          throw new ApiError(404, "Drop not found");
        }

        const lockedDrop = lockedDropRows[0]!;

        if (!lockedDrop.is_live) {
          throw new ApiError(409, "Drop is not live yet");
        }

        const existingActiveReservationRows = (await txClient.$queryRaw(
          Prisma.sql`
            SELECT id, user_id, drop_id, status, expires_at, created_at
            FROM "Reservation"
            WHERE user_id = ${payload.userId}
              AND drop_id = ${payload.dropId}
              AND status = ${"ACTIVE"}::"ReservationStatus"
              AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE
          `
        )) as IReservationRow[];

        const existingActiveReservation = existingActiveReservationRows[0];

        if (existingActiveReservation) {
          // Idempotent reserve behavior for repeated clicks / multi-tab same user flow.
          // We return the same active reservation without decrementing stock again.
          return {
            reservation: existingActiveReservation,
            drop: {
              id: lockedDrop.id,
              available_stock: lockedDrop.available_stock,
            },
          };
        }

        if (lockedDrop.available_stock <= 0) {
          throw new ApiError(409, "Out of stock");
        }

        const updatedDrop = await txClient.drop.update({
          where: { id: payload.dropId },
          data: {
            available_stock: { decrement: 1 },
          },
          select: {
            id: true,
            available_stock: true,
          },
        });

        const createdReservationRows = (await txClient.$queryRaw(
          Prisma.sql`
            INSERT INTO "Reservation" (user_id, drop_id, status, expires_at)
            VALUES (
              ${payload.userId},
              ${payload.dropId},
              ${"ACTIVE"}::"ReservationStatus",
              NOW() + INTERVAL '60 seconds'
            )
            RETURNING id, user_id, drop_id, status, expires_at, created_at
          `
        )) as IReservationRow[];

        const createdReservation = createdReservationRows[0]!;

        return {
          reservation: createdReservation,
          drop: updatedDrop,
        };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );
    } catch (error: any) {
      // DB-level unique guard fallback:
      // if two requests race to create ACTIVE reservation, return existing winner.
      const isUniqueActiveReservationConflict =
        error?.message?.includes("reservation_one_active_per_user_drop") ||
        error?.meta?.message?.includes("reservation_one_active_per_user_drop");

      if (!isUniqueActiveReservationConflict) {
        throw error;
      }

      const existingActiveReservationRows = (await prismaClient.$queryRaw(
        Prisma.sql`
          SELECT id, user_id, drop_id, status, expires_at, created_at
          FROM "Reservation"
          WHERE user_id = ${payload.userId}
            AND drop_id = ${payload.dropId}
            AND status = ${"ACTIVE"}::"ReservationStatus"
            AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1
        `
      )) as IReservationRow[];

      const existingActiveReservation = existingActiveReservationRows[0];

      if (!existingActiveReservation) {
        throw error;
      }

      const currentDrop = await prismaClient.drop.findUnique({
        where: { id: payload.dropId },
        select: {
          id: true,
          available_stock: true,
        },
      });

      if (!currentDrop) {
        throw new ApiError(404, "Drop not found");
      }

      transactionResult = {
        reservation: existingActiveReservation,
        drop: currentDrop,
      };
    }

    if (!transactionResult) {
      throw new ApiError(500, "Failed to create reservation");
    }

    // Socket event:
    // emit after transaction commit so clients only see committed stock.
    emitStockUpdate({
      dropId: transactionResult.drop.id,
      available_stock: transactionResult.drop.available_stock,
    });

    return transactionResult.reservation;
  }
}
