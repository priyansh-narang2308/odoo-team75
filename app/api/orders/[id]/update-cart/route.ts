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
      promotionId,
      discountTotal,
      subtotal,
      taxTotal,
      grandTotal,
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

    // Use a transaction to delete old items, insert new items, and update order details
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      // 2. Insert new items
      if (items && items.length > 0) {
        await tx.orderItem.createMany({
          data: items.map((item: any) => ({
            orderId: id,
            productId: item.productId,
            quantity: item.quantity,
            lineTotal: item.price * item.quantity,
            notes: item.notes || null,
          })),
        });
      }

      // 3. Update order details
      return await tx.order.update({
        where: { id },
        data: {
          tableId: tableId || null,
          customerId: customerId || null,
          promotionId: promotionId || null,
          discountTotal: discountTotal || 0,
          subtotal: subtotal || 0,
          taxTotal: taxTotal || 0,
          grandTotal: grandTotal || 0,
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
    });

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
