import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
    return NextResponse.json({ ok: true, data: table }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Table number already exists on this floor" },
      { status: 409 },
    );
  }
}
