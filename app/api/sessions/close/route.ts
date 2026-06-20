import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const closeSessionSchema = z.object({
  sessionId: z.string(),
  closingAmount: z.number().min(0, "Closing amount cannot be negative"),
});

export async function POST(request: Request) {
  const staffSession = await getServerSession(authOptions);

  if (!staffSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parsed = closeSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { sessionId, closingAmount } = parsed.data;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found" },
        { status: 404 },
      );
    }

    if (
      session.userId !== staffSession.user.id &&
      staffSession.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    if (session.closedAt) {
      return NextResponse.json(
        { ok: false, error: "Session is already closed" },
        { status: 400 },
      );
    }

    const closedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        closedAt: new Date(),
        closingAmount,
      },
    });

    return NextResponse.json({ ok: true, data: closedSession });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to close session" },
      { status: 500 },
    );
  }
}
