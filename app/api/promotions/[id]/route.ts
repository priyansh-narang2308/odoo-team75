import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/promotions/[id]
export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );

  const { id } = await params;
  const body = await req.json();

  const {
    code,
    name,
    discountType,
    discountValue,
    minOrderAmount,
    maxUses,
    validUntil,
    isActive,
    productId,
    categoryId,
    minQuantity,
  } = body;

  const promo = await prisma.promotion.update({
    where: { id },
    data: {
      ...(code !== undefined && { code: code || null }),
      ...(name !== undefined && { name }),
      ...(discountType !== undefined && { discountType }),
      ...(discountValue !== undefined && { discountValue }),
      ...(minOrderAmount !== undefined && { minOrderAmount: minOrderAmount || null }),
      ...(productId !== undefined && { productId: productId || null }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(minQuantity !== undefined && { minQuantity: minQuantity || null }),
      ...(maxUses !== undefined && { maxUses: maxUses || null }),
      ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ ok: true, data: promo });
}

// DELETE /api/promotions/[id]
export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );

  const { id } = await params;
  await prisma.promotion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
