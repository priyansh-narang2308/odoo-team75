import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { processPaymentSchema } from "@/lib/validations/payment";
import { sendReceiptEmail } from "@/lib/email";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { rateLimitPayment } from "@/lib/cache/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io;
}

// POST /api/orders/[id]/pay
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimitPayment(ip);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: "Too many payment attempts. Try again later." },
      { status: 429 },
    );
  }

  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = processPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { methodId, amount, transactionRef, notes } = parsed.data;

  // Get order with items
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { name: true, taxRate: true } } },
      },
      table: {
        select: { tableNumber: true, floor: { select: { name: true } } },
      },
      customer: { select: { email: true, name: true } },
      payments: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Order not found" },
      { status: 404 },
    );
  }

  if (order.status === "PAID") {
    return NextResponse.json(
      { ok: false, error: "Order already paid" },
      { status: 400 },
    );
  }

  if (order.status === "CANCELLED") {
    return NextResponse.json(
      { ok: false, error: "Cannot pay a cancelled order" },
      { status: 400 },
    );
  }

  // Verify payment amount
  if (amount < Number(order.grandTotal) - 0.01) {
    return NextResponse.json(
      {
        ok: false,
        error: `Payment amount (₹${amount.toFixed(2)}) is less than the required grand total (₹${Number(order.grandTotal).toFixed(2)}).`,
      },
      { status: 400 },
    );
  }

  // Verify payment method
  const paymentMethod = await prisma.paymentMethod.findUnique({
    where: { id: methodId, isEnabled: true },
  });

  if (!paymentMethod) {
    return NextResponse.json(
      { ok: false, error: "Payment method not available" },
      { status: 400 },
    );
  }

  // Create payment and update order status in an interactive transaction to prevent TOCTOU
  let payment, updatedOrder;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch order inside transaction
      const txOrder = await tx.order.findUnique({ where: { id } });
      if (!txOrder) throw new Error("Order not found");
      if (txOrder.status === "PAID") throw new Error("Order already paid");
      if (txOrder.status === "CANCELLED")
        throw new Error("Cannot pay a cancelled order");

      const p = await tx.payment.create({
        data: {
          orderId: id,
          methodId,
          amount,
          transactionRef,
          notes,
        },
      });

      const o = await tx.order.update({
        where: { id },
        data: { status: "PAID" },
      });

      return { p, o };
    }, { maxWait: 15000, timeout: 30000 });
    payment = result.p;
    updatedOrder = result.o;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: "PAYMENT_PROCESSED",
      entity: "Order",
      entityId: id,
      userId: staffSession?.user.id ?? null,
      meta: {
        amount,
        method: paymentMethod.name,
        transactionRef,
      },
    },
  });

  // Emit WebSocket payment event
  const io = getIO();
  if (io) {
    const paymentPayload = {
      orderId: id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      amount,
      method: paymentMethod.name,
    };

    io.to("cashier").emit(SOCKET_EVENTS.PAYMENT_RECEIVED, paymentPayload);
    io.to("admin").emit(SOCKET_EVENTS.PAYMENT_RECEIVED, paymentPayload);

    if (order.tableId) {
      io.to(`table:${order.tableId}`).emit(
        SOCKET_EVENTS.PAYMENT_RECEIVED,
        paymentPayload,
      );
      // Update table status
      io.to("cashier").emit(SOCKET_EVENTS.TABLE_STATUS, {
        tableId: order.tableId,
        status: "available",
      });
    }
  }

  // Send email receipt
  const emailTo = order.customer?.email;
  if (emailTo) {
    try {
      await sendReceiptEmail({
        to: emailTo,
        customerName: order.customer?.name || "Customer",
        orderNumber: order.orderNumber,
        tableNumber: order.table?.tableNumber,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        subtotal: Number(order.subtotal),
        taxTotal: Number(order.taxTotal),
        discountTotal: Number(order.discountTotal),
        grandTotal: Number(order.grandTotal),
        paymentMethod: paymentMethod.name,
        paidAt: new Date(),
      });
    } catch (emailErr) {
      console.error("[Payment] Email receipt failed:", emailErr);
      // Don't fail the payment if email fails
    }
  }

  return NextResponse.json({
    ok: true,
    data: { payment, order: updatedOrder },
  });
}
