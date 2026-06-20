import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndSaveQR } from "@/lib/qr";
import fs from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tables/[id]
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const table = await prisma.table.findUnique({
    where: { id },
    include: {
      floor: true,
      orders: {
        where: { status: { in: ["DRAFT", "SENT"] } },
        include: {
          items: { include: { product: { select: { name: true } } } },
          customer: { select: { name: true } },
        },
      },
    },
  });

  if (!table) {
    return NextResponse.json(
      { ok: false, error: "Table not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: table });
}

// PATCH /api/tables/[id] — Update table (Admin only)
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const existingTable = await prisma.table.findUnique({
    where: { id },
  });
  if (!existingTable) {
    return NextResponse.json(
      { ok: false, error: "Table not found" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { tableNumber, seats, isActive, x, y, width, height, status } = body;

  let updatedQrToken = undefined;
  let updatedQrGeneratedAt = undefined;

  const isRenamed = tableNumber !== undefined && tableNumber !== existingTable.tableNumber;
  const isDeactivated = isActive === false || (isActive === undefined && existingTable.isActive && body.isActive === false);
  const isReactivated = isActive === true && !existingTable.isActive;

  const qrDir = path.join(process.cwd(), "public", "qrcodes");

  if (isRenamed || isDeactivated) {
    const oldFilename = `table-${existingTable.tableNumber.replace(/\s+/g, "-")}-${id}.png`;
    const oldFilePath = path.join(qrDir, oldFilename);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (e) {
        console.error("Failed to delete old QR file:", oldFilePath, e);
      }
    }
  }

  if (isRenamed || isReactivated) {
    try {
      const targetTableNumber = tableNumber !== undefined ? tableNumber : existingTable.tableNumber;
      updatedQrToken = await generateAndSaveQR({
        id,
        floorId: existingTable.floorId,
        tableNumber: targetTableNumber,
      });
      updatedQrGeneratedAt = new Date();
    } catch (e) {
      console.error("Failed to generate QR on table modification:", e);
    }
  }

  try {
    const table = await prisma.table.update({
      where: { id },
      data: {
        ...(tableNumber !== undefined && { tableNumber }),
        ...(seats !== undefined && { seats }),
        ...(isActive !== undefined && { isActive }),
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(status !== undefined && { status }),
        ...(updatedQrToken !== undefined && { qrToken: updatedQrToken }),
        ...(updatedQrGeneratedAt !== undefined && { qrGeneratedAt: updatedQrGeneratedAt }),
      },
      include: { floor: true },
    });

    return NextResponse.json({ ok: true, data: table });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Table number already exists on this floor" },
      { status: 409 },
    );
  }
}

// DELETE /api/tables/[id] — Deactivate table (Admin only)
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const existingTable = await prisma.table.findUnique({
    where: { id },
  });
  if (!existingTable) {
    return NextResponse.json(
      { ok: false, error: "Table not found" },
      { status: 404 },
    );
  }

  // Delete corresponding QR code file from disk
  const qrDir = path.join(process.cwd(), "public", "qrcodes");
  const qrFilename = `table-${existingTable.tableNumber.replace(/\s+/g, "-")}-${id}.png`;
  const qrFilePath = path.join(qrDir, qrFilename);
  if (fs.existsSync(qrFilePath)) {
    try {
      fs.unlinkSync(qrFilePath);
    } catch (e) {
      console.error("Failed to delete QR file:", qrFilePath, e);
    }
  }

  const table = await prisma.table.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true, data: table });
}
