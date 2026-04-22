import { prisma } from "../src/lib/prisma.ts";

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.purchase.deleteMany();
    await tx.reservation.deleteMany();
    await tx.drop.deleteMany();
    await tx.user.deleteMany();

    const users = await Promise.all([
      tx.user.create({ data: { username: "sarah_sneaks" } }),
      tx.user.create({ data: { username: "muhib_runner" } }),
      tx.user.create({ data: { username: "tania_kicks" } }),
      tx.user.create({ data: { username: "rafi_dropday" } }),
    ]);

    const now = Date.now();
    const drops = await Promise.all([
      tx.drop.create({
        data: {
          name: "Air Jordan 4 Metallic",
          price: 28000,
          total_stock: 120,
          available_stock: 117,
          start_time: new Date(now - 1000 * 60 * 30),
        },
      }),
      tx.drop.create({
        data: {
          name: "Yeezy Boost 700 V2",
          price: 34000,
          total_stock: 80,
          available_stock: 80,
          start_time: new Date(now - 1000 * 60 * 20),
        },
      }),
      tx.drop.create({
        data: {
          name: "Nike Air Max 95 Neon",
          price: 22000,
          total_stock: 90,
          available_stock: 90,
          start_time: new Date(now - 1000 * 60 * 15),
        },
      }),
    ]);

    await Promise.all([
      tx.purchase.create({
        data: {
          user_id: users[0]!.id,
          drop_id: drops[0]!.id,
        },
      }),
      tx.purchase.create({
        data: {
          user_id: users[1]!.id,
          drop_id: drops[0]!.id,
        },
      }),
      tx.purchase.create({
        data: {
          user_id: users[2]!.id,
          drop_id: drops[0]!.id,
        },
      }),
    ]);
  });

  console.log("Seed completed: users, drops, and demo purchases inserted.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });