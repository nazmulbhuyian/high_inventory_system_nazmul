import { Prisma } from "../../../generated/prisma/client.js";
import ApiError from "../../errors/ApiError.js";
import { prisma } from "../../lib/prisma.js";
import { emitStockUpdate } from "../../shared/socket.js";
import { IPurchaseInput, IPurchaseRow } from "./purchase.interface.js";

export class PurchaseService {
  async createPurchase(payload: IPurchaseInput): Promise<IPurchaseRow> {
    const prismaClient = prisma as any;

    const transactionResult = await prismaClient.$transaction(
      async (txClient: any) => {
        // Transaction flow (atomic):
        // 1) Lock one ACTIVE reservation row for this user/drop pair.
        // 2) Validate reservation is still valid (not expired).
        // 3) Create purchase + mark reservation COMPLETED.
        // This prevents double-complete under concurrent purchase requests.
        const activeReservationRows = (await txClient.$queryRaw(
          Prisma.sql`
            SELECT id, user_id, drop_id, status, expires_at, created_at
            FROM "Reservation"
            WHERE user_id = ${payload.userId}
              AND drop_id = ${payload.dropId}
              AND status = ${"ACTIVE"}::"ReservationStatus"
              AND expires_at > NOW()
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE
          `
        )) as Array<{
          id: number;
          user_id: number;
          drop_id: number;
          status: "ACTIVE" | "EXPIRED" | "COMPLETED";
          expires_at: Date;
          created_at: Date;
        }>;

        if (!activeReservationRows.length) {
          const latestReservationRows = (await txClient.$queryRaw(
            Prisma.sql`
              SELECT id, status, expires_at, created_at, (expires_at > NOW()) AS not_expired
              FROM "Reservation"
              WHERE user_id = ${payload.userId}
                AND drop_id = ${payload.dropId}
              ORDER BY created_at DESC
              LIMIT 1
            `
          )) as Array<{
            id: number;
            status: "ACTIVE" | "EXPIRED" | "COMPLETED";
            expires_at: Date;
            created_at: Date;
            not_expired: boolean;
          }>;

          const latestReservation = latestReservationRows[0];

          if (
            latestReservation &&
            latestReservation.status === "COMPLETED" &&
            latestReservation.not_expired
          ) {
            const existingPurchase = await txClient.purchase.findFirst({
              where: {
                user_id: payload.userId,
                drop_id: payload.dropId,
                created_at: { gte: latestReservation.created_at },
              },
              orderBy: {
                created_at: "desc",
              },
            });

            if (existingPurchase) {
              const dropRow = await txClient.drop.findUnique({
                where: { id: payload.dropId },
                select: {
                  id: true,
                  available_stock: true,
                },
              });

              return {
                purchase: existingPurchase,
                drop: dropRow,
              };
            }

            throw new ApiError(409, "Duplicate action: purchase already completed");
          }

          throw new ApiError(400, "Invalid reservation: no active reservation found");
        }

        const activeReservation = activeReservationRows[0]!;

        const createdPurchase = await txClient.purchase.create({
          data: {
            user_id: payload.userId,
            drop_id: payload.dropId,
          },
        });

        await txClient.reservation.update({
          where: {
            id: activeReservation.id,
          },
          data: {
            status: "COMPLETED",
          },
        });

        const dropRow = await txClient.drop.findUnique({
          where: { id: payload.dropId },
          select: {
            id: true,
            available_stock: true,
          },
        });

        return {
          purchase: createdPurchase,
          drop: dropRow,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    // Socket event:
    // purchase does not change stock, but broadcasting current stock keeps
    // dashboards in sync after purchase completion events.
    if (transactionResult.drop) {
      emitStockUpdate({
        dropId: transactionResult.drop.id,
        available_stock: transactionResult.drop.available_stock,
      });
    }

    return transactionResult.purchase;
  }
}

