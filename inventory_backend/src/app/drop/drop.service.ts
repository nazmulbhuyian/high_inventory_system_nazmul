import { prisma } from "../../lib/prisma.js";
import { emitStockUpdate } from "../../shared/socket.js";
import { IDropCreateInput, IDropResponse } from "./drop.interface.js";

export class DropService {
  async create(payload: IDropCreateInput) {
    const db = prisma as any;

    const createdDrop = await db.drop.create({
      data: {
        name: payload.name,
        price: payload.price,
        total_stock: payload.total_stock,
        available_stock: payload.total_stock,
        start_time: new Date(payload.start_time),
      },
    });

    // Broadcast creation via stock event so dashboards can refetch and show the new drop.
    emitStockUpdate({
      dropId: createdDrop.id,
      available_stock: createdDrop.available_stock,
    });

    return createdDrop;
  }

  async getAll(): Promise<IDropResponse[]> {
    const db = prisma as any;

    const drops = await db.drop.findMany({
      where: {
        start_time: { lte: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    const dropResponses = await Promise.all(
      drops.map(async (drop: any) => {
        const latestPurchases = await db.purchase.findMany({
          where: { drop_id: drop.id },
          orderBy: { created_at: "desc" },
          take: 30,
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
        });

        const uniqueLatestPurchasers: string[] = [];
        const seenUsernames = new Set<string>();

        for (const purchase of latestPurchases) {
          const username = purchase.user?.username;

          if (!username || seenUsernames.has(username)) {
            continue;
          }

          seenUsernames.add(username);
          uniqueLatestPurchasers.push(username);

          if (uniqueLatestPurchasers.length === 3) {
            break;
          }
        }

        return {
          id: drop.id,
          name: drop.name,
          price: drop.price,
          total_stock: drop.total_stock,
          available_stock: drop.available_stock,
          start_time: drop.start_time,
          created_at: drop.created_at,
          latest_purchasers: uniqueLatestPurchasers,
        };
      })
    );

    return dropResponses;
  }
}
