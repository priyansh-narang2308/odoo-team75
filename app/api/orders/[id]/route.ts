import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { SOCKET_EVENTS } from "@/lib/socket-events";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io;
}

// GET /api/orders/[id]
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            include: { category: { select: { name: true, color: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      payments: { include: { method: true } },
      table: { include: { floor: true } },
      customer: { select: { id: true, name: true, email: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Order not found" },
      { status: 404 },
    );
  }

  // Customers can only view their own orders
  if (customerSession && !staffSession) {
    if (order.customerId !== customerSession.customerId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
    }
  }

  return NextResponse.json({ ok: true, data: order });
}

// PATCH /api/orders/[id] — Update status (SENT, CANCELLED)
export async function PATCH(request: Request, { params }: RouteParams) {
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
  const { status, customerNote } = body;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Order not found" },
      { status: 404 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    // If the order is being cancelled, decrement the promotion's usedCount
    if (status === "CANCELLED" && order.status !== "CANCELLED" && order.promotionId) {
      await tx.promotion.update({
        where: { id: order.promotionId },
        data: { usedCount: { decrement: 1 } },
      });
    }

    return await tx.order.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(customerNote !== undefined && { customerNote }),
      },
      include: {
        table: { select: { tableNumber: true } },
        items: {
          include: {
            product: {
              include: { category: { select: { name: true } } },
            },
          },
        },
      },
    });
  });

  // Emit WebSocket events
  const io = getIO();
  if (io) {
    const payload = {
      orderId: id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      tableId: updated.tableId,
    };

    io.to("cashier").emit(SOCKET_EVENTS.ORDER_STATUS, payload);
    io.to("admin").emit(SOCKET_EVENTS.ORDER_STATUS, payload);

    if (updated.tableId) {
      io.to(`table:${updated.tableId}`).emit(
        SOCKET_EVENTS.ORDER_STATUS,
        payload,
      );
    }

    // When order is SENT → emit to kitchen
    if (status === "SENT") {
      const kdsPayload = {
        orderId: id,
        orderNumber: updated.orderNumber,
        tableId: updated.tableId,
        tableNumber: updated.table?.tableNumber,
        source: updated.source,
        createdAt: updated.createdAt.toISOString(),
        items: updated.items
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
  }

  return NextResponse.json({ ok: true, data: updated });
}

// DELETE /api/orders/[id] — Cancel order
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const staffSession = await getServerSession(authOptions);
  if (!staffSession || !["ADMIN", "CASHIER"].includes(staffSession.user.role)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Order not found" },
      { status: 404 },
    );
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    if (order.status !== "CANCELLED" && order.promotionId) {
      await tx.promotion.update({
        where: { id: order.promotionId },
        data: { usedCount: { decrement: 1 } },
      });
    }

    return await tx.order.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: "ORDER_CANCELLED",
      entity: "Order",
      entityId: id,
      userId: staffSession.user.id,
    },
  });

  const io = getIO();
  if (io) {
    io.to("cashier").emit(SOCKET_EVENTS.ORDER_STATUS, {
      orderId: id,
      orderNumber: updatedOrder.orderNumber,
      status: "CANCELLED",
      tableId: updatedOrder.tableId,
    });
  }

  return NextResponse.json({ ok: true, data: updatedOrder });
}
