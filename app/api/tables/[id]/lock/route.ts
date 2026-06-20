import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { acquireTableLock, releaseTableLock } from "@/lib/cache/table-lock";
import { prisma } from "@/lib/prisma";
import { SOCKET_EVENTS } from "@/lib/socket-events";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io;
}

// POST /api/tables/[id]/lock — Acquire or release table lock
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !["CASHIER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { action } = body; // "acquire" | "release"

  if (action === "acquire") {
    const acquired = await acquireTableLock(id, session.user.id);

    if (!acquired) {
      // Get the holder's name
      const { getTableLockHolder } = await import("@/lib/cache/table-lock");
      const holderId = await getTableLockHolder(id);
      const holder = holderId
        ? await prisma.user.findUnique({
            where: { id: holderId },
            select: { name: true },
          })
        : null;

      return NextResponse.json(
        {
          ok: false,
          error: `Table is being edited by ${holder?.name || "another cashier"}`,
          lockedBy: holder?.name,
        },
        { status: 409 },
      );
    }

    const io = getIO();
    if (io) {
      io.to("cashier").emit(SOCKET_EVENTS.TABLE_LOCK_ACQUIRED, {
        tableId: id,
        userId: session.user.id,
        userName: session.user.name,
      });
    }

    return NextResponse.json({ ok: true, data: { locked: true } });
  }

  if (action === "release") {
    await releaseTableLock(id, session.user.id);

    const io = getIO();
    if (io) {
      io.to("cashier").emit(SOCKET_EVENTS.TABLE_LOCK_RELEASED, {
        tableId: id,
        userId: session.user.id,
        userName: session.user.name,
      });
    }

    return NextResponse.json({ ok: true, data: { locked: false } });
  }

  return NextResponse.json(
    { ok: false, error: "Invalid action. Use 'acquire' or 'release'" },
    { status: 400 },
  );
}
