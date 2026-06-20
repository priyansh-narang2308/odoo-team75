import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const openSessionSchema = z.object({
  openingAmount: z.number().min(0, "Opening amount cannot be negative"),
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
    const parsed = openSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    // Check if there is already an open session
    const existing = await prisma.session.findFirst({
      where: {
        userId: staffSession.user.id,
        closedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "A session is already open" },
        { status: 400 },
      );
    }

    const session = await prisma.session.create({
      data: {
        userId: staffSession.user.id,
        openingAmount: parsed.data.openingAmount,
      },
    });

    return NextResponse.json({ ok: true, data: session }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to open session" },
      { status: 500 },
    );
  }
}
