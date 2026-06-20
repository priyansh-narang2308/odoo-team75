import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/reservations/[id] - Cancel/Remove a reservation
export async function DELETE(
  _req: Request,
  { params }: RouteParams
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Reservation not found" },
        { status: 404 }
      );
    }

    await prisma.reservation.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, message: "Reservation cancelled successfully" });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to cancel reservation" },
      { status: 500 }
    );
  }
}
