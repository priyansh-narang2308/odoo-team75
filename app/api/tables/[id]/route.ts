import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const body = await request.json();
  const { tableNumber, seats, isActive, x, y, width, height, status } = body;

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

  const table = await prisma.table.update({
    where: { id },
    data: {
      isActive: false,
      tableNumber: `${existingTable.tableNumber}_deleted_${Date.now()}_${id.slice(-4)}`,
    },
  });

  return NextResponse.json({ ok: true, data: table });
}
