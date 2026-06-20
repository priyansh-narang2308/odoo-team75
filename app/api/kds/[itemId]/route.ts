import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SOCKET_EVENTS } from "@/lib/socket-events";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io;
}

const KDS_STATUS_ORDER = ["TO_COOK", "PREPARING", "COMPLETED"] as const;

// PATCH /api/kds/[itemId] — Update KDS item status
export async function PATCH(request: Request, { params }: RouteParams) {
  const { itemId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !["KITCHEN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { kdsStatus } = body;

  if (!KDS_STATUS_ORDER.includes(kdsStatus)) {
    return NextResponse.json(
      { ok: false, error: "Invalid KDS status" },
      { status: 400 },
    );
  }

  const item = await prisma.orderItem.update({
    where: { id: itemId },
    data: { kdsStatus },
    include: {
      product: { select: { name: true } },
      order: {
        include: {
          table: { select: { tableNumber: true } },
        },
      },
    },
  });

  // Re-fetch items AFTER the update to avoid stale pre-update data
  const freshItems = await prisma.orderItem.findMany({
    where: { 
      orderId: item.orderId,
      product: {
        showInKds: true
      }
    },
    select: { kdsStatus: true },
  });

  const io = getIO();
  if (io) {
    const itemPayload = {
      orderId: item.orderId,
      itemId: item.id,
      productName: item.product.name,
      kdsStatus: item.kdsStatus,
    };

    io.to("kitchen").emit(SOCKET_EVENTS.KDS_ITEM_UPDATED, itemPayload);
    io.to("cashier").emit(SOCKET_EVENTS.KDS_ITEM_UPDATED, itemPayload);
    io.to("admin").emit(SOCKET_EVENTS.KDS_ITEM_UPDATED, itemPayload);

    if (item.order.tableId) {
      io.to(`table:${item.order.tableId}`).emit(
        SOCKET_EVENTS.KDS_ITEM_UPDATED,
        itemPayload,
      );
    }

    // Check if ALL items in the order are COMPLETED (using fresh data)
    const allCompleted = freshItems.every(
      (i: { kdsStatus: string }) => i.kdsStatus === "COMPLETED",
    );
    const anyPreparingOrCompleted = freshItems.some(
      (i: { kdsStatus: string }) => i.kdsStatus === "PREPARING" || i.kdsStatus === "COMPLETED"
    );

    let newOrderStatus: "READY" | "PREPARING" | null = null;
    if (allCompleted) {
      newOrderStatus = "READY";
    } else if (anyPreparingOrCompleted) {
      newOrderStatus = "PREPARING";
    }

    if (newOrderStatus && item.order.status !== "PAID" && item.order.status !== "CANCELLED" && item.order.status !== newOrderStatus) {
      await prisma.order.update({
        where: { id: item.orderId },
        data: { status: newOrderStatus },
      });

      const statusPayload = {
        orderId: item.orderId,
        status: newOrderStatus,
      };
      io.to("cashier").emit(SOCKET_EVENTS.ORDER_STATUS, statusPayload);
      io.to("admin").emit(SOCKET_EVENTS.ORDER_STATUS, statusPayload);
      if (item.order.tableId) {
        io.to(`table:${item.order.tableId}`).emit(
          SOCKET_EVENTS.ORDER_STATUS,
          statusPayload,
        );
      }
    }

    if (allCompleted) {
      const completePayload = {
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        tableId: item.order.tableId,
      };

      io.to("kitchen").emit(SOCKET_EVENTS.KDS_ORDER_COMPLETE, completePayload);
      io.to("cashier").emit(SOCKET_EVENTS.KDS_ORDER_COMPLETE, completePayload);
      io.to("admin").emit(SOCKET_EVENTS.KDS_ORDER_COMPLETE, completePayload);

      if (item.order.tableId) {
        io.to(`table:${item.order.tableId}`).emit(
          SOCKET_EVENTS.KDS_ORDER_COMPLETE,
          completePayload,
        );
      }
    }
  }

  return NextResponse.json({ ok: true, data: item });
}
