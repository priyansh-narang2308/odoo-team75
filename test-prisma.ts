import { PrismaClient, OrderStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ["SENT", "PAID", "PREPARING", "READY"] as OrderStatus[]
        }
      }
    });
    console.log("Success! Found", orders.length, "orders.");
  } catch (e) {
    console.error(e);
  }
}
main();
