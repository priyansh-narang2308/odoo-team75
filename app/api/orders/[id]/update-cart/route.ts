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

    // 2. Validate Promotion if requested
    let finalPromotionId = requestedPromotionId || null;
    let computedDiscount = 0;

    if (finalPromotionId) {
      const promo = await prisma.promotion.findUnique({
        where: { id: finalPromotionId },
      });
      const now = new Date();

      let isValidPromo = true;
      if (!promo || !promo.isActive) isValidPromo = false;
      else if (promo.validFrom && now < promo.validFrom) isValidPromo = false;
      else if (promo.validUntil && now > promo.validUntil) isValidPromo = false;
      else if (promo.maxUses && promo.usedCount >= promo.maxUses)
        isValidPromo = false;
      else if (
        promo.minOrderAmount &&
        computedSubtotal < Number(promo.minOrderAmount)
      )
        isValidPromo = false;

      if (!isValidPromo) {
        finalPromotionId = null;
      } else {
        if (promo!.discountType === "PERCENTAGE") {
          computedDiscount =
            (computedSubtotal * Number(promo!.discountValue)) / 100;
        } else {
          computedDiscount = Number(promo!.discountValue);
          if (computedDiscount > computedSubtotal) {
            // Strip promotion if fixed discount exceeds subtotal
            finalPromotionId = null;
            computedDiscount = 0;
          }
        }
      }
    }

    // Recompute exact effective tax based on the subtotal proportion that remains after discount
    const taxProportion = Math.max(
      0,
      computedSubtotal > 0
        ? (computedSubtotal - computedDiscount) / computedSubtotal
        : 0,
    );
    const finalTaxTotal = computedTaxTotal * taxProportion;
    const computedGrandTotal = Math.max(
      0,
      computedSubtotal - computedDiscount + finalTaxTotal,
    );

    // Use a transaction to delete old items, insert new items, and update order details
    const updatedOrder = await prisma.$transaction(async (tx) => {
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

      // 3. Update order details
      const updated = await tx.order.update({
        where: { id },
        data: {
          tableId: tableId || null,
          customerId: customerId || null,
          promotionId: finalPromotionId,
          discountTotal: computedDiscount,
          subtotal: computedSubtotal,
          taxTotal: finalTaxTotal,
          grandTotal: computedGrandTotal,
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
      if (existingOrder.promotionId !== finalPromotionId) {
        if (existingOrder.promotionId) {
          await tx.promotion.update({
            where: { id: existingOrder.promotionId },
            data: { usedCount: { decrement: 1 } },
          });
        }
        if (finalPromotionId) {
          await tx.promotion.update({
            where: { id: finalPromotionId },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      return updated;
    }, { maxWait: 15000, timeout: 30000 });

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
