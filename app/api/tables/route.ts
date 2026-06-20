import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateAndSaveQR } from "@/lib/qr";
import fs from "fs";
import path from "path";

const createTableSchema = z.object({
  tableNumber: z.string().min(1),
  seats: z.number().int().min(1),
  floorId: z.string().min(1),
  x: z.number().int().min(0).default(0),
  y: z.number().int().min(0).default(0),
  width: z.number().int().min(1).default(1),
  height: z.number().int().min(1).default(1),
  status: z.string().default("AVAILABLE"),
});

// GET /api/tables — List all tables with floor and current order status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const floorId = searchParams.get("floorId");

  const tables = await prisma.table.findMany({
    where: {
      isActive: true,
      ...(floorId ? { floorId } : {}),
    },
    include: {
      floor: {
        select: { id: true, name: true, gridWidth: true, gridHeight: true },
      },
      orders: {
        where: { status: { in: ["DRAFT", "SENT"] } },
        select: { id: true, status: true, grandTotal: true },
      },
      reservations: {
        where: {
          reserveTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        select: {
          id: true,
          reserveTime: true,
          customerName: true,
          phone: true,
          seats: true,
        },
      },
    },
    orderBy: [{ floor: { sortOrder: "asc" } }, { tableNumber: "asc" }],
  });

  return NextResponse.json({ ok: true, data: tables });
}

// POST /api/tables — Create a new table (Admin only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = createTableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    const table = await prisma.table.create({
      data: parsed.data,
      include: { floor: true },
    });

    // Auto-generate QR code upon creation
    let qrToken = null;
    try {
      qrToken = await generateAndSaveQR({
        id: table.id,
        floorId: table.floorId,
        tableNumber: table.tableNumber,
      });

      // Update the DB record with the new token
      await prisma.table.update({
        where: { id: table.id },
        data: { qrToken, qrGeneratedAt: new Date() },
      });
      table.qrToken = qrToken;
      table.qrGeneratedAt = new Date();
    } catch (qrErr) {
      console.error("Auto-QR generation failed on create:", qrErr);
    }

    return NextResponse.json({ ok: true, data: table }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Table number already exists on this floor" },
      { status: 409 },
    );
  }
}

// DELETE /api/tables — Bulk deactivate all active tables for a floor (Admin only)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const floorId = searchParams.get("floorId");

  if (!floorId) {
    return NextResponse.json(
      { ok: false, error: "Missing floorId parameter" },
      { status: 400 },
    );
  }

  try {
    const activeTables = await prisma.table.findMany({
      where: { floorId, isActive: true },
    });

    if (activeTables.length > 0) {
      // Delete all corresponding QR code files from disk
      const qrDir = path.join(process.cwd(), "public", "qrcodes");
      for (const t of activeTables) {
        const qrFilename = `table-${t.tableNumber.replace(/\s+/g, "-")}-${t.id}.png`;
        const qrFilePath = path.join(qrDir, qrFilename);
        if (fs.existsSync(qrFilePath)) {
          try {
            fs.unlinkSync(qrFilePath);
          } catch (e) {
            console.error("Failed to delete QR file:", qrFilePath, e);
          }
        }
      }

      await prisma.$transaction(
        activeTables.map((t) =>
          prisma.table.update({
            where: { id: t.id },
            data: {
              isActive: false,
              tableNumber: `${t.tableNumber}_deleted_${Date.now()}_${t.id.slice(-4)}`,
            },
          })
        )
      );
    }

    return NextResponse.json({ ok: true, count: activeTables.length });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to clear floor layout" },
      { status: 500 }
    );
  }
}
