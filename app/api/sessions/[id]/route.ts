import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closeSessionSchema } from "@/lib/validations/payment";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/sessions/[id] — Close a POS session
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !["CASHIER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = closeSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const posSession = await prisma.session.findUnique({ where: { id } });
  if (!posSession || posSession.userId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
  }

  if (posSession.closedAt) {
    return NextResponse.json(
      { ok: false, error: "Session already closed" },
      { status: 400 }
    );
  }

  const closed = await prisma.session.update({
    where: { id },
    data: {
      closedAt: new Date(),
      closingAmount: parsed.data.closingAmount,
    },
  });

  return NextResponse.json({ ok: true, data: closed });
}

// GET /api/sessions/[id] — Get session summary (Z-report data)
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const posSession = await prisma.session.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      orders: {
        where: { status: "PAID" },
        include: {
          payments: {
            include: { method: { select: { name: true, type: true } } },
          },
          items: {
            include: { product: { select: { name: true } } },
          },
          table: { select: { tableNumber: true } },
        },
      },
    },
  });

  if (!posSession) {
    return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
  }

  // Compute Z-report summary
  const totalRevenue = posSession.orders.reduce(
    (sum, o) => sum + Number(o.grandTotal),
    0
  );

  const byMethod = posSession.orders
    .flatMap((o) => o.payments)
    .reduce((acc, p) => {
      const key = p.method.type;
      acc[key] = (acc[key] || 0) + Number(p.amount);
      return acc;
    }, {} as Record<string, number>);

  return NextResponse.json({
    ok: true,
    data: {
      session: posSession,
      summary: {
        totalOrders: posSession.orders.length,
        totalRevenue,
        byMethod,
      },
    },
  });
}
