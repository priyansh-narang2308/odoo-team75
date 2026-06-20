import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signQRToken } from "@/lib/qr";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/tables/[id]/qr — Generate/regenerate QR token for table
export async function POST(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const table = await prisma.table.findUnique({
    where: { id },
    include: { floor: true },
  });

  if (!table) {
    return NextResponse.json(
      { ok: false, error: "Table not found" },
      { status: 404 },
    );
  }

  // Sign a new JWT token for this table
  const token = await signQRToken({
    tableId: table.id,
    floorId: table.floorId,
    tableNumber: table.tableNumber,
  });

  // Generate QR code PNG
  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/order/${token}`;

  // Save QR code to public/qrcodes/
  const qrDir = path.join(process.cwd(), "public", "qrcodes");
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  const qrFilename = `table-${table.tableNumber.replace(/\s+/g, "-")}-${id}.png`;
  const qrFilePath = path.join(qrDir, qrFilename);

  await QRCode.toFile(qrFilePath, qrUrl, {
    width: 512,
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
  });

  // Store token in DB
  const updatedTable = await prisma.table.update({
    where: { id },
    data: {
      qrToken: token,
      qrGeneratedAt: new Date(),
    },
    include: { floor: true },
  });

  return NextResponse.json({
    ok: true,
    data: {
      table: updatedTable,
      qrUrl,
      qrImageUrl: `/qrcodes/${qrFilename}`,
      token,
    },
  });
}
