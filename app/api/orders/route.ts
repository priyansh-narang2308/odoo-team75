import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validations/order";
import { SOCKET_EVENTS } from "@/lib/socket-events";

function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io;
}

// GET /api/orders — List orders
export async function GET(request: Request) {
  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tableId = searchParams.get("tableId");
  const history = searchParams.get("history") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const dateRange = searchParams.get("dateRange");

  // Customers can only see their own orders
  if (customerSession && !staffSession) {
    const orders = await prisma.order.findMany({
      where: {
        customerId: customerSession.customerId,
        ...(history ? {} : { tableId: tableId || customerSession.tableId }),
        ...(status
          ? { status: status as "DRAFT" | "SENT" | "PAID" | "CANCELLED" }
          : {}),
      },
      include: {
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
        payments: {
          include: { method: { select: { name: true, type: true } } },
        },
        table: {
          select: { tableNumber: true, floor: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ ok: true, data: orders });
  }

  // Date filtering logic
  let dateFilter = {};
  if (dateRange === "today") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    dateFilter = {
      createdAt: {
        gte: startOfToday,
      },
    };
  }

  // Staff can see all orders
  const orders = await prisma.order.findMany({
    where: {
      ...(status
        ? { status: status as "DRAFT" | "SENT" | "PAID" | "CANCELLED" }
        : {}),
      ...(tableId ? { tableId } : {}),
      ...dateFilter,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              imageUrl: true,
              showInKds: true,
              category: { select: { name: true } },
            },
          },
        },
      },
      payments: { include: { method: true } },
      table: {
        select: { tableNumber: true, floor: { select: { name: true } } },
      },
      customer: { select: { id: true, name: true, email: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ ok: true, data: orders });
}

// POST /api/orders — Create a new order
export async function POST(request: Request) {
  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      tableId,
      source,
      customerNote,
      sessionId,
      customerId,
      promotionId,
    } = parsed.data;

    const isCashier = source === "CASHIER";

    // Verify correct session exists for the source
    if (isCashier && !staffSession) {
      return NextResponse.json(
        { ok: false, error: "Staff session required" },
        { status: 401 },
      );
    }
    if (!isCashier && !customerSession) {
      return NextResponse.json(
        { ok: false, error: "Customer session required" },
        { status: 401 },
      );
    }

    // Validate promotion if provided
    if (promotionId) {
      const promo = await prisma.promotion.findUnique({
        where: { id: promotionId },
      });
      if (!promo || !promo.isActive) {
        return NextResponse.json(
          { ok: false, error: "Invalid or expired promotion" },
          { status: 400 },
        );
      }
      const now = new Date();
      if (promo.validFrom && now < promo.validFrom) {
        return NextResponse.json(
          { ok: false, error: "Promotion not yet active" },
          { status: 400 },
        );
      }
      if (promo.validUntil && now > promo.validUntil) {
        return NextResponse.json(
          { ok: false, error: "Promotion has expired" },
          { status: 400 },
        );
      }
      if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        return NextResponse.json(
          { ok: false, error: "Promotion usage limit reached" },
          { status: 400 },
        );
      }
    }

    const order = await prisma.order.create({
      data: {
        status: "DRAFT",
        source,
        customerNote,
        subtotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: 0,
        tableId:
          tableId || (!isCashier ? (customerSession?.tableId ?? null) : null),
        userId: isCashier ? staffSession?.user.id || null : null,
        customerId: isCashier
          ? customerId || null
          : customerSession?.customerId || null,
        sessionId: sessionId || null,
        promotionId: promotionId || null,
      },
    });

    // Increment promotion usedCount if one was applied
    if (promotionId) {
      await prisma.promotion.update({
        where: { id: promotionId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Notify admin room that a new order was created
    const io = getIO();
    if (io) {
      io.to("admin").emit(SOCKET_EVENTS.ORDER_PLACED, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        tableId: order.tableId,
      });
    }

    return NextResponse.json({ ok: true, data: order }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orders] Failed to create order:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create order" },
      { status: 500 },
    );
  }
}
