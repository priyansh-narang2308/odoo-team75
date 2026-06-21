import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { generateAndSaveQR } from "../lib/qr";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tables = await prisma.table.findMany();
  for (const table of tables) {
    if (true) {
      console.log(`Generating QR for ${table.tableNumber}...`);
      const qrPath = await generateAndSaveQR({
        id: table.id,
        floorId: table.floorId,
        tableNumber: table.tableNumber,
      });
      await prisma.table.update({
        where: { id: table.id },
        data: { qrToken: qrPath },
      });
      console.log(`Updated table ${table.tableNumber} with QR code ${qrPath}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
