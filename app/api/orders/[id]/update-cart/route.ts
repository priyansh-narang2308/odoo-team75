/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SOCKET_EVENTS } from "@/lib/socket-events";

function getIO() {
  return (global as any).io;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const staffSession = await getServerSession(authOptions);

  if (!staffSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const {
      items,
      tableId,
      customerId,
      promotionId: requestedPromotionId,
      customerNote,
      sessionId,
    } = body;

    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 },
      );
    }

    if (existingOrder.status !== "DRAFT") {
      return NextResponse.json(
        { ok: false, error: "Only DRAFT orders can be edited" },
        { status: 400 },
      );
    }

    // 1. Fetch products to calculate exact totals securely
    const productIds = (items || []).map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let computedSubtotal = 0;
    let computedTaxTotal = 0;
    const validItems: any[] = [];

    for (const item of items || []) {
      if (!item.quantity || item.quantity <= 0) continue;
      const product = productMap.get(item.productId);
      if (!product) continue;
      if (!product.isAvailable) {
        throw new Error(`Product ${product.name} is currently unavailable`);
      }

      const lineTotal = Number(product.price) * item.quantity;
      const lineTax = lineTotal * (Number(product.taxRate) / 100);

      computedSubtotal += lineTotal;
      computedTaxTotal += lineTax;

      validItems.push({
        orderId: id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        lineTotal,
        notes: item.notes || null,
      });
    }

    // Use a transaction to delete old items, insert new items, and update order details
    const updatedOrderParams = await prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      // 2. Insert new items
      if (validItems.length > 0) {
        await tx.orderItem.createMany({
          data: validItems,
        });
      }

      // 3. Update order details (exclude calculated totals)
      const updated = await tx.order.update({
        where: { id },
        data: {
          tableId: tableId || null,
          customerId: customerId || null,
          promotionId: requestedPromotionId || null,
          customerNote: customerNote || null,
          sessionId: sessionId || existingOrder.sessionId,
          updatedAt: new Date(),
        },
        include: {
          items: true,
          table: true,
          customer: true,
        },
      });

      // 4. Sync promotion usedCount if the promotion was changed
      if (existingOrder.promotionId !== requestedPromotionId) {
        if (existingOrder.promotionId) {
          await tx.promotion.update({
            where: { id: existingOrder.promotionId },
            data: { usedCount: { decrement: 1 } },
          });
        }
        if (requestedPromotionId) {
          await tx.promotion.update({
            where: { id: requestedPromotionId },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      return updated;
    });

    const { recalculateOrderTotals } = await import("@/lib/order-recalc");
    const updatedOrder = await recalculateOrderTotals(updatedOrderParams.id);
    if (!updatedOrder) throw new Error("Failed to recalculate order totals");

    // Notify admin/cashier rooms that order was updated
    const io = getIO();
    if (io) {
      io.to("admin").emit(SOCKET_EVENTS.ORDER_STATUS, {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        tableId: updatedOrder.tableId,
      });
    }

    return NextResponse.json({ ok: true, data: updatedOrder });
  } catch (error: any) {
    console.error("[PUT /api/orders/[id]/update-cart] Failed:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update order" },
      { status: 500 },
    );
  }
}
