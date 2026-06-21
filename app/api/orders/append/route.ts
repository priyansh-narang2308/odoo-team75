/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { SOCKET_EVENTS } from "@/lib/socket-events";

function getIO() {
  return (global as any).io;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { tableId, items, source } = body;

  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession && source !== "CUSTOMER") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!tableId || !items || !items.length) {
    return NextResponse.json(
      { ok: false, error: "Missing tableId or items" },
      { status: 400 },
    );
  }

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Find an active order for this table
      let order = await tx.order.findFirst({
        where: {
          tableId,
          status: { in: ["DRAFT", "SENT"] },
        },
      });

      if (!order) {
        // Validate customerId still exists in DB before linking
        let validCustomerId = null;
        if (customerSession?.customerId) {
          const cust = await tx.customer.findUnique({ where: { id: customerSession.customerId }});
          if (cust) validCustomerId = cust.id;
        }

        // Create new order
        order = await tx.order.create({
          data: {
            tableId,
            source: source || (customerSession ? "CUSTOMER" : "CASHIER"),
            customerId: validCustomerId,
            userId: staffSession?.user?.id || null,
            status: "SENT",
            subtotal: 0,
            taxTotal: 0,
            grandTotal: 0,
          },
        });
      } else if (order.status === "DRAFT") {
        // If it was DRAFT, bump to SENT because we are dispatching to kitchen
        order = await tx.order.update({
          where: { id: order.id },
          data: { status: "SENT" },
        });
      }

      // Add new items
      const newOrderItems = [];
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const lineTotal = Number(product.price) * item.quantity;
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
            lineTotal,
            notes: item.notes,
            kdsStatus: "TO_COOK",
          },
          include: {
            product: { select: { name: true, showInKds: true } },
          },
        });
        newOrderItems.push(orderItem);
      }

      // Recalculate order totals
      const allItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
        include: { product: true },
      });

      const subtotal = allItems.reduce(
        (sum, i) => sum + Number(i.lineTotal),
        0,
      );
      const taxTotal = allItems.reduce(
        (sum, i) =>
          sum + Number(i.lineTotal) * (Number(i.product.taxRate) / 100),
        0,
      );
      const discountTotal = Number(order.discountTotal) || 0;
      const grandTotal = Math.max(0, subtotal + taxTotal - discountTotal);

      const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: { subtotal, taxTotal, grandTotal },
        include: { table: true },
      });

      return { finalOrder, newOrderItems };
    });

    const io = getIO();
    if (io) {
      const payload = {
        orderId: updatedOrder.finalOrder.id,
        orderNumber: updatedOrder.finalOrder.orderNumber,
        status: updatedOrder.finalOrder.status,
        tableId: updatedOrder.finalOrder.tableId,
        grandTotal: Number(updatedOrder.finalOrder.grandTotal),
      };

      io.to("cashier").emit(SOCKET_EVENTS.ORDER_UPDATED, payload);
      io.to("cashier").emit(SOCKET_EVENTS.ORDER_PLACED, payload); // ensure refresh fires
      io.to("admin").emit(SOCKET_EVENTS.ORDER_UPDATED, payload);
      io.to(`table:${tableId}`).emit(SOCKET_EVENTS.ORDER_UPDATED, payload);
      io.to(`table:${tableId}`).emit(SOCKET_EVENTS.ORDER_PLACED, payload);

      // Emitting KDS_NEW_TICKET for *only* the newly added items
      const kdsItems = updatedOrder.newOrderItems
        .filter((item) => item.product.showInKds !== false)
        .map((item) => ({
          id: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          notes: item.notes,
          kdsStatus: item.kdsStatus,
        }));

      if (kdsItems.length > 0) {
        const kdsPayload = {
          orderId: updatedOrder.finalOrder.id,
          orderNumber: updatedOrder.finalOrder.orderNumber,
          tableId: updatedOrder.finalOrder.tableId,
          tableNumber: updatedOrder.finalOrder.table?.tableNumber,
          source: updatedOrder.finalOrder.source,
          createdAt: new Date().toISOString(),
          items: kdsItems,
        };
        io.to("kitchen").emit(SOCKET_EVENTS.KDS_NEW_TICKET, kdsPayload);
      }
    }

    return NextResponse.json({ ok: true, data: updatedOrder.finalOrder });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }
}
