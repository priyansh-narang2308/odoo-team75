/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/promotions — List all promotions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (false)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });

  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, data: promotions });
}

// POST /api/promotions — Create a promotion
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (false)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const { code, name, discountType, discountValue, minOrderAmount, maxUses, validUntil, isActive, productId, minQuantity } = body;

  if (!name || !discountType || discountValue === undefined)
    return NextResponse.json({ ok: false, error: "name, discountType, discountValue required" }, { status: 400 });

  try {
    const promo = await prisma.promotion.create({
      data: {
        code: code || null,
        name,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount || null,
        productId: productId || null,
        minQuantity: minQuantity || null,
        maxUses: maxUses || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json({ ok: true, data: promo }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ ok: false, error: "Promo code already exists" }, { status: 409 });
    return NextResponse.json({ ok: false, error: "Failed to create promotion" }, { status: 500 });
  }
}


