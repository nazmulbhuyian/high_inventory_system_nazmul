import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { emitStockUpdate } from "../shared/socket.js";

const JOB_INTERVAL_MS = 5 * 1000;

let jobTimer: NodeJS.Timeout | null = null;
let isCycleRunning = false;

export class ReservationExpirationJob {
    // Expiration cycle:
    // 1) Mark expired ACTIVE reservations as EXPIRED
    // 2) Restore stock per drop in batch
    // Entire operation runs in one transaction to keep state consistent.
    private async runCycle(): Promise<void> {
        // Overlap guard: if previous cycle is still running, skip this tick.
        if (isCycleRunning) {
            return;
        }
        isCycleRunning = true;

        try {
            const db = prisma as any;

            const restoredDrops = await db.$transaction(async (tx: any) => {
                // Efficient expiration strategy:
                // - Update all expired ACTIVE reservations in one statement.
                // - Aggregate only rows expired in this exact statement.
                // - Restore stock per drop in one batched UPDATE.
                const restored = (await tx.$queryRaw(
                    Prisma.sql`
            WITH expired AS (
              UPDATE "Reservation"
              SET status = ${"EXPIRED"}::"ReservationStatus"
              WHERE status = ${"ACTIVE"}::"ReservationStatus"
                AND expires_at < NOW()
              RETURNING drop_id
            ),
            expired_counts AS (
              SELECT drop_id, COUNT(*)::int AS expired_count
              FROM expired
              GROUP BY drop_id
            ),
            restored AS (
              UPDATE "Drop" AS d
              SET available_stock = d.available_stock + ec.expired_count
              FROM expired_counts AS ec
              WHERE d.id = ec.drop_id
              RETURNING d.id, d.available_stock
            )
            SELECT id, available_stock
            FROM restored
          `
                )) as Array<{ id: number; available_stock: number }>;
                return restored;
            });

            if (!restoredDrops.length) {
                return;
            }

            // Socket event broadcast:
            // send one stock_update per changed drop after DB commit.
            for (const drop of restoredDrops) {
                emitStockUpdate({
                    dropId: drop.id,
                    available_stock: drop.available_stock,
                });
            }
        } catch (error: any) {
            console.error("Reservation expiration job failed:", error?.message || error);
        } finally {
            isCycleRunning = false;
        }
    }

    public start(): void {
        if (jobTimer) {
            return;
        }
        jobTimer = setInterval(() => {
            this.runCycle();
        }, JOB_INTERVAL_MS);

        // Do not keep Node process alive only for this timer.
        jobTimer.unref?.();

        console.log("Reservation expiration job started (every 5 seconds)");
    }

    public stop(): void {
        if (!jobTimer) {
            return;
        }

        clearInterval(jobTimer);
        jobTimer = null;
        console.log("Reservation expiration job stopped");
    }
}

export const reservationExpirationJob = new ReservationExpirationJob();
