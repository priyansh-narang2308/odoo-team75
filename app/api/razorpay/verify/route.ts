import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { SOCKET_EVENTS } from "@/lib/socket-events";

function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io;
}

// POST /api/razorpay/verify — Verify Razorpay payment signature & mark order PAID
export async function POST(request: Request) {
  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    cafeOrderId, // Our internal order ID
  } = await request.json();

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !cafeOrderId
  ) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Verify signature
  const expectedSignature = createHmac(
    "sha256",
    process.env.RAZORPAY_KEY_SECRET || "",
  )
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json(
      { ok: false, error: "Payment verification failed — invalid signature" },
      { status: 400 },
    );
  }

  // Find the UPI / Razorpay payment method
  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: { type: "UPI", isEnabled: true },
  });

  if (!paymentMethod) {
    return NextResponse.json(
      { ok: false, error: "Payment method not configured" },
      { status: 400 },
    );
  }

  // Get the order to determine amount
  const cafeOrder = await prisma.order.findUnique({
    where: { id: cafeOrderId },
    include: {
      items: {
        include: { product: { select: { name: true, taxRate: true, showInKds: true } } },
      },
      table: { select: { tableNumber: true } },
      customer: { select: { name: true, email: true } },
    },
  });

  if (!cafeOrder) {
    return NextResponse.json(
      { ok: false, error: "Order not found" },
      { status: 404 },
    );
  }

  if (cafeOrder.status === "PAID") {
    return NextResponse.json(
      { ok: false, error: "Order already paid" },
      { status: 400 },
    );
  }

  // Record payment and mark order as PAID
  const [payment, updatedOrder] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        orderId: cafeOrderId,
        methodId: paymentMethod.id,
        amount: cafeOrder.grandTotal,
        transactionRef: razorpay_payment_id,
        notes: `Razorpay Order: ${razorpay_order_id}`,
      },
    }),
    prisma.order.update({
      where: { id: cafeOrderId },
      data: { status: "PAID" },
    }),
  ]);

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: "PAYMENT_PROCESSED",
      entity: "Order",
      entityId: cafeOrderId,
      userId: staffSession?.user.id ?? null,
      meta: {
        amount: Number(cafeOrder.grandTotal),
        method: "Razorpay",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
    },
  });

  // Send email receipt
  const emailTo = cafeOrder.customer?.email;
  if (emailTo) {
    console.log(
      `[Verify] Customer email found: ${emailTo}. Attempting to send receipt...`,
    );
    try {
      const { sendReceiptEmail } = await import("@/lib/email");
      await sendReceiptEmail({
        to: emailTo,
        customerName: cafeOrder.customer?.name || "Customer",
        orderNumber: cafeOrder.orderNumber,
        tableNumber: cafeOrder.table?.tableNumber,
        items: cafeOrder.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        subtotal: Number(cafeOrder.subtotal),
        taxTotal: Number(cafeOrder.taxTotal),
        discountTotal: Number(cafeOrder.discountTotal),
        grandTotal: Number(cafeOrder.grandTotal),
        paymentMethod: "Razorpay (Online)",
        paidAt: new Date(),
      });
    } catch (emailErr) {
      console.error("[Verify] Email receipt failed:", emailErr);
    }
  } else {
    console.log(
      `[Verify] No email address attached to order ${cafeOrder.orderNumber}. Skipping receipt email.`,
    );
  }

  // WebSocket broadcast
  const io = getIO();
  if (io) {
    const paymentPayload = {
      orderId: cafeOrderId,
      orderNumber: cafeOrder.orderNumber,
      tableId: cafeOrder.tableId,
      amount: Number(cafeOrder.grandTotal),
      method: "Razorpay",
    };
    io.to("cashier").emit(SOCKET_EVENTS.PAYMENT_RECEIVED, paymentPayload);
    io.to("admin").emit(SOCKET_EVENTS.PAYMENT_RECEIVED, paymentPayload);
    if (cafeOrder.tableId) {
      io.to(`table:${cafeOrder.tableId}`).emit(
        SOCKET_EVENTS.PAYMENT_RECEIVED,
        paymentPayload,
      );
      io.to("cashier").emit(SOCKET_EVENTS.TABLE_STATUS, {
        tableId: cafeOrder.tableId,
        status: "available",
      });
    }

    // Send ticket to kitchen
    const kdsPayload = {
      orderId: cafeOrderId,
      orderNumber: cafeOrder.orderNumber,
      tableId: cafeOrder.tableId,
      tableNumber: cafeOrder.table?.tableNumber,
      source: cafeOrder.source,
      createdAt: cafeOrder.createdAt.toISOString(),
      items: cafeOrder.items
        .filter((item) => item.product.showInKds !== false)
        .map((item) => ({
          id: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          notes: item.notes,
          kdsStatus: item.kdsStatus,
        })),
    };
    io.to("kitchen").emit(SOCKET_EVENTS.KDS_NEW_TICKET, kdsPayload);
  }

  return NextResponse.json({
    ok: true,
    data: { payment, order: updatedOrder },
  });
}
