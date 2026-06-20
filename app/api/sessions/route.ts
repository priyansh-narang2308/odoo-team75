import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openSessionSchema } from "@/lib/validations/payment";

// POST /api/sessions — Open a new POS session
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["CASHIER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = openSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  // Check for existing open session
  const existing = await prisma.session.findFirst({
    where: {
      userId: session.user.id,
      closedAt: null,
    },
  });

  if (existing) {
    return NextResponse.json({ ok: true, data: existing }); // Return existing session
  }

  const posSession = await prisma.session.create({
    data: {
      userId: session.user.id,
      openingAmount: parsed.data.openingAmount,
    },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ ok: true, data: posSession }, { status: 201 });
}

// GET /api/sessions — Get current active session
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const posSession = await prisma.session.findFirst({
    where: { userId: session.user.id, closedAt: null },
    include: {
      user: { select: { name: true } },
      orders: {
        where: { status: { not: "DRAFT" } },
        include: { payments: { include: { method: true } } },
      },
    },
  });

  return NextResponse.json({ ok: true, data: posSession });
}
