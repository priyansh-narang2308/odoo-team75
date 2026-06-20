import "dotenv/config";
import { prisma } from "./lib/prisma";
import { signQRToken } from "./lib/qr";
import fs from "fs";

async function run() {
  const tables = await prisma.table.findMany({ include: { floor: true } });
  const data = [];

  for (const table of tables) {
    let token = table.qrToken;
    if (!token) {
      token = await signQRToken({
        tableId: table.id,
        floorId: table.floorId,
        tableNumber: table.tableNumber,
      });
      await prisma.table.update({
        where: { id: table.id },
        data: { qrToken: token, qrGeneratedAt: new Date() },
      });
    }

    const url = `${process.env.NEXT_PUBLIC_APP_URL}/order/${token}`;
    data.push({ tableNumber: table.tableNumber, url });
  }

  fs.writeFileSync("qr_data.json", JSON.stringify(data, null, 2));
  console.log("Wrote qr_data.json");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
