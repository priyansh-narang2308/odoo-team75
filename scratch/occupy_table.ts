import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const table = await prisma.table.findFirst({
    where: { tableNumber: "T1" }
  });
  
  if (!table) {
    console.error("Table T1 not found");
    return;
  }

  // Create an active draft order to occupy the table
  const order = await prisma.order.create({
    data: {
      status: "DRAFT",
      source: "CUSTOMER",
      subtotal: 150.00,
      taxTotal: 7.50,
      grandTotal: 157.50,
      tableId: table.id,
    }
  });

  console.log(`Successfully occupied table T1 (ID: ${table.id}) with active Order ID: ${order.id}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
