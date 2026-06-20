import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/promotions/validate — Validate a promo code
export async function POST(request: Request) {
  const body = await request.json();
  const { code, orderTotal } = body;

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Promo code required" },
      { status: 400 },
    );
  }

  const promo = await prisma.promotion.findUnique({
    where: { code },
  });

  if (!promo || !promo.isActive) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired promo code" },
      { status: 400 },
    );
  }

  const now = new Date();

  if (promo.validFrom && now < promo.validFrom) {
    return NextResponse.json(
      { ok: false, error: "Promo code not yet active" },
      { status: 400 },
    );
  }

  if (promo.validUntil && now > promo.validUntil) {
    return NextResponse.json(
      { ok: false, error: "Promo code has expired" },
      { status: 400 },
    );
  }

  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return NextResponse.json(
      { ok: false, error: "Promo code has reached its usage limit" },
      { status: 400 },
    );
  }

  if (promo.minOrderAmount && orderTotal < Number(promo.minOrderAmount)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Minimum order amount of ₹${Number(promo.minOrderAmount).toFixed(2)} required`,
      },
      { status: 400 },
    );
  }

  // Calculate discount
  let discountAmount = 0;
  if (promo.discountType === "PERCENTAGE") {
    discountAmount = (orderTotal * Number(promo.discountValue)) / 100;
  } else {
    discountAmount = Math.min(Number(promo.discountValue), orderTotal);
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: promo.id,
      name: promo.name,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue),
      discountAmount,
    },
  });
}
