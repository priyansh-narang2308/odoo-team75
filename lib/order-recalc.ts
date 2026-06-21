import { prisma } from "@/lib/prisma";

export async function simulateOrderTotals(items: { productId: string; quantity: number; price?: number }[], promotionId: string | null = null) {
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: items.map(i => i.productId) } },
    include: { category: true }
  });
  const productMap = new Map(dbProducts.map(p => [p.id, p]));

  let initialSubtotal = 0;
  let initialTaxTotal = 0;
  let itemDiscountsTotal = 0;

  let promo = null;
  let promoActive = false;
  if (promotionId) {
    promo = await prisma.promotion.findUnique({ where: { id: promotionId } });
    if (promo && promo.isActive) {
      promoActive = true;
      const now = new Date();
      if (promo.validFrom && now < promo.validFrom) promoActive = false;
      if (promo.validUntil && now > promo.validUntil) promoActive = false;
    }
  }

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    
    const lineTotal = Number(product.price) * item.quantity;
    const taxRate = Number(product.taxRate) || 0;
    
    initialSubtotal += lineTotal;
    initialTaxTotal += lineTotal * (taxRate / 100);

    let currentItemDiscount = 0;

    if (item.quantity >= 3) {
      currentItemDiscount += lineTotal * 0.15;
    }

    if (promoActive) {
      const p = promo!;
      let appliesToItem = false;
      if (p.productId && p.productId === item.productId) appliesToItem = true;
      else if (p.categoryId && p.categoryId === product.categoryId) appliesToItem = true;

      if (appliesToItem) {
        let promoDiscount = 0;
        if (p.discountType === "PERCENTAGE") {
          promoDiscount = lineTotal * (Number(p.discountValue) / 100);
        } else {
          promoDiscount = Number(p.discountValue);
        }
        currentItemDiscount += promoDiscount;
      }
    }

    if (currentItemDiscount > lineTotal) currentItemDiscount = lineTotal;
    itemDiscountsTotal += currentItemDiscount;
  }

  let remainingSubtotal = initialSubtotal - itemDiscountsTotal;
  let autoOrderDiscount = 0;
  let promoOrderDiscount = 0;

  if (remainingSubtotal > 1000) {
    autoOrderDiscount = remainingSubtotal * 0.10;
    remainingSubtotal -= autoOrderDiscount;
  }

  if (promoActive && !promo!.productId && !promo!.categoryId) {
    const p = promo!;
    const minAmount = p.minOrderAmount ? Number(p.minOrderAmount) : 0;
    if (initialSubtotal >= minAmount) {
      if (p.discountType === "PERCENTAGE") {
        promoOrderDiscount = remainingSubtotal * (Number(p.discountValue) / 100);
      } else {
        promoOrderDiscount = Number(p.discountValue);
      }
    }
  }

  let totalDiscount = itemDiscountsTotal + autoOrderDiscount + promoOrderDiscount;
  if (totalDiscount > initialSubtotal) totalDiscount = initialSubtotal;

  const taxProportion = initialSubtotal > 0 ? (initialSubtotal - totalDiscount) / initialSubtotal : 0;
  const finalTaxTotal = initialTaxTotal * taxProportion;
  const grandTotal = Math.max(0, initialSubtotal - totalDiscount + finalTaxTotal);

  return {
    subtotal: initialSubtotal,
    taxTotal: finalTaxTotal,
    discountTotal: totalDiscount,
    grandTotal,
  };
}


export async function recalculateOrderTotals(
  orderId: string,
  txClient?: any
) {
  const db = txClient || prisma;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
        },
      },
    },
  });

  if (!order) return null;

  // Fetch promotion separately (no direct relation on Order model)
  const promotion = order.promotionId
    ? await db.promotion.findUnique({
        where: { id: order.promotionId },
      })
    : null;


  const items = order.items || [];
  let initialSubtotal = 0;
  let initialTaxTotal = 0;
  let itemDiscountsTotal = 0;

  const now = new Date();
  let promoActive = false;
  if (promotion && promotion.isActive) {
    promoActive = true;
    if (promotion.validFrom && now < promotion.validFrom) promoActive = false;
    if (promotion.validUntil && now > promotion.validUntil) promoActive = false;
  }

  for (const item of items) {
    const lineTotal = Number(item.lineTotal);
    const taxRate = Number(item.product.taxRate) || 0;
    
    initialSubtotal += lineTotal;
    initialTaxTotal += lineTotal * (taxRate / 100);

    let currentItemDiscount = 0;

    // 1. Automatic Dish-level discount (15% if quantity >= 3)
    if (item.quantity >= 3) {
      currentItemDiscount += lineTotal * 0.15;
    }

    // 2. Applied Promotion (item or category level)
    if (promoActive) {
      const p = promotion!;
      let appliesToItem = false;
      
      if (p.productId && p.productId === item.productId) {
        appliesToItem = true;
      } else if (p.categoryId && p.categoryId === item.product.categoryId) {
        appliesToItem = true;
      }

      if (appliesToItem) {
        let promoDiscount = 0;
        if (p.discountType === "PERCENTAGE") {
          promoDiscount = lineTotal * (Number(p.discountValue) / 100);
        } else {
          // Fixed discount applied to the item
          promoDiscount = Number(p.discountValue);
        }
        currentItemDiscount += promoDiscount;
      }
    }

    // Cap the total discount on this item so we don't exceed its lineTotal
    if (currentItemDiscount > lineTotal) {
      currentItemDiscount = lineTotal;
    }

    itemDiscountsTotal += currentItemDiscount;
  }

  let remainingSubtotal = initialSubtotal - itemDiscountsTotal;
  let autoOrderDiscount = 0;
  let promoOrderDiscount = 0;

  // 3. Automatic Order-level discount (10% if subtotal > 1000)
  if (remainingSubtotal > 1000) {
    autoOrderDiscount = remainingSubtotal * 0.10;
    remainingSubtotal -= autoOrderDiscount;
  }

  // 4. Applied Promotion (order level)
  if (promoActive && !promotion!.productId && !promotion!.categoryId) {
    const p = promotion!;
    const minAmount = p.minOrderAmount ? Number(p.minOrderAmount) : 0;
    if (initialSubtotal >= minAmount) {
      if (p.discountType === "PERCENTAGE") {
        promoOrderDiscount = remainingSubtotal * (Number(p.discountValue) / 100);
      } else {
        promoOrderDiscount = Number(p.discountValue);
      }
    }
  }

  let totalDiscount = itemDiscountsTotal + autoOrderDiscount + promoOrderDiscount;
  if (totalDiscount > initialSubtotal) {
    totalDiscount = initialSubtotal;
  }

  // 5. Calculate proportional tax
  const taxProportion = initialSubtotal > 0 ? (initialSubtotal - totalDiscount) / initialSubtotal : 0;
  const finalTaxTotal = initialTaxTotal * taxProportion;

  const grandTotal = Math.max(0, initialSubtotal - totalDiscount + finalTaxTotal);

  // 6. Update order
  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      subtotal: initialSubtotal,
      taxTotal: finalTaxTotal,
      discountTotal: totalDiscount,
      grandTotal: grandTotal,
    }
  });

  return updatedOrder;
}
