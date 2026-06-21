import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { addOrderItemSchema } from "@/lib/validations/order";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { recalculateOrderTotals } from "@/lib/order-recalc";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io;
}

// POST /api/orders/[id]/items — Add item to order
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = addOrderItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { productId, quantity, notes } = parsed.data;

  // Verify order exists and is editable
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Order not found" },
      { status: 404 },
    );
  }

  if (!["DRAFT"].includes(order.status)) {
    return NextResponse.json(
      { ok: false, error: "Cannot add items to a finalized order" },
      { status: 400 },
    );
  }

  // Get product price
  const product = await prisma.product.findUnique({
    where: { id: productId, isArchived: false },
  });

  if (!product || !product.isAvailable) {
    return NextResponse.json(
      { ok: false, error: "Product not available" },
      { status: 400 },
    );
  }

  const unitPrice = Number(product.price);
  const lineTotal = unitPrice * quantity;

  // Check if item already exists
  const existing = await prisma.orderItem.findFirst({
    where: { orderId: id, productId },
  });

  let item;
  if (existing) {
    item = await prisma.orderItem.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + quantity,
        lineTotal: Number(existing.lineTotal) + lineTotal,
        notes: notes || existing.notes,
      },
      include: { product: { select: { name: true } } },
    });
  } else {
    item = await prisma.orderItem.create({
      data: {
        orderId: id,
        productId,
        quantity,
        unitPrice,
        lineTotal,
        notes,
        kdsStatus: "TO_COOK",
      },
      include: { product: { select: { name: true } } },
    });
  }

  // Recalculate order totals (including discounts)
  const updatedOrder = await recalculateOrderTotals(id);
  if (!updatedOrder) {
    return NextResponse.json(
      { ok: false, error: "Failed to recalculate totals" },
      { status: 500 },
    );
  }

  // Emit update
  const io = getIO();
  if (io) {
    const payload = {
      orderId: id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      grandTotal: Number(updatedOrder.grandTotal),
    };
    io.to("cashier").emit(SOCKET_EVENTS.ORDER_UPDATED, payload);
    if (order.tableId) {
      io.to(`table:${order.tableId}`).emit(
        SOCKET_EVENTS.ORDER_UPDATED,
        payload,
      );
    }
  }

  return NextResponse.json(
    { ok: true, data: { item, order: updatedOrder } },
    { status: 201 },
  );
}

// DELETE /api/orders/[id]/items?itemId=xxx — Remove item
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!itemId) {
    return NextResponse.json(
      { ok: false, error: "itemId required" },
      { status: 400 },
    );
  }

  await prisma.orderItem.delete({ where: { id: itemId, orderId: id } });

  // Recalculate totals (including discounts)
  const updatedOrder = await recalculateOrderTotals(id);
  if (!updatedOrder) {
    return NextResponse.json(
      { ok: false, error: "Failed to recalculate totals" },
      { status: 500 },
    );
  }

  const io = getIO();
  if (io) {
    io.to("cashier").emit(SOCKET_EVENTS.ORDER_UPDATED, {
      orderId: id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      grandTotal: Number(updatedOrder.grandTotal),
    });
  }

  return NextResponse.json({ ok: true, data: updatedOrder });
}
