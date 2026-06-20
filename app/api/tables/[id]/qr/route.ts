import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndSaveQR } from "@/lib/qr";

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

  try {
    const token = await generateAndSaveQR({
      id: table.id,
      floorId: table.floorId,
      tableNumber: table.tableNumber,
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

    const qrFilename = `table-${table.tableNumber.replace(/\s+/g, "-")}-${id}.png`;
    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/order/${token}`;

    return NextResponse.json({
      ok: true,
      data: {
        table: updatedTable,
        qrUrl,
        qrImageUrl: `/qrcodes/${qrFilename}`,
        token,
      },
    });
  } catch (error: any) {
    console.error("Manual QR generation route failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate QR code" },
      { status: 500 },
    );
  }
}
