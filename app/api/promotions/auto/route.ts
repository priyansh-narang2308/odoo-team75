import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/promotions/auto?orderTotal=<number>
 * Returns all active auto-applicable promotions (those WITHOUT a code)
 * that are eligible for the given order total.
 * The frontend will automatically apply the best one.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderTotalParam = searchParams.get("orderTotal");
  const orderTotal = orderTotalParam ? parseFloat(orderTotalParam) : 0;
  const itemsParam = searchParams.get("items");
  let items: { productId: string; quantity: number; price: number; categoryId?: string }[] = [];
  try {
    if (itemsParam) items = JSON.parse(itemsParam);
  } catch {}

  const now = new Date();

  // Find all active promotions without a code (auto-apply type)
  const promos = await prisma.promotion.findMany({
    where: {
      isActive: true,
      code: null, // No code = auto-apply
      OR: [{ validFrom: null }, { validFrom: { lte: now } }],
      AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }],
    },
    orderBy: { discountValue: "desc" }, // Best discount first
  });

  // Filter by min order amount, max uses, and product/quantity requirements
  const eligible = promos
    .filter((p) => {
      if (p.maxUses && p.usedCount >= p.maxUses) return false;

      // Order-level promotion
      if (!p.productId) {
        if (p.minOrderAmount && orderTotal < Number(p.minOrderAmount))
          return false;
        return true;
      }

      // Product-level or Category-level promotion
      const item = items.find((i) => 
        (p.productId && i.productId === p.productId) || 
        (p.categoryId && i.categoryId === p.categoryId)
      );
      if (!item) return false;
      if (p.minQuantity && item.quantity < p.minQuantity) return false;
      return true;
    })
    .map((p) => {
      let discountAmount = 0;
      let applicableTotal = orderTotal;

      if (p.productId || p.categoryId) {
        const matchingItems = items.filter((i) => 
          (p.productId && i.productId === p.productId) || 
          (p.categoryId && i.categoryId === p.categoryId)
        );
        applicableTotal = matchingItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      }

      if (p.discountType === "PERCENTAGE") {
        discountAmount = (applicableTotal * Number(p.discountValue)) / 100;
      } else {
        discountAmount = Math.min(Number(p.discountValue), applicableTotal);
      }
      return {
        id: p.id,
        name: p.name,
        discountType: p.discountType,
        discountValue: Number(p.discountValue),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        minOrderAmount: p.minOrderAmount ? Number(p.minOrderAmount) : null,
      };
    });

  return NextResponse.json({ ok: true, data: eligible });
}
