import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SOCKET_EVENTS } from "@/lib/socket-events";

function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    // Update all non-completed orders for this table to PAID
    await prisma.order.updateMany({
      where: {
        tableId: id,
        status: { notIn: ["PAID", "CANCELLED"] },
      },
      data: { status: "PAID" },
    });

    // Also update table status to AVAILABLE
    await prisma.table.update({
      where: { id },
      data: { status: "AVAILABLE" },
    });

    const io = getIO();
    if (io) {
      io.emit(SOCKET_EVENTS.ORDER_STATUS); // trigger refresh
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/tables/[id]/free]", error);
    return NextResponse.json(
      { ok: false, error: "Failed to free table" },
      { status: 500 },
    );
  }
}
