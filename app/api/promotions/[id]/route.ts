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

  const data: Record<string, unknown> = {};
  if (body.code !== undefined) data.code = body.code || null;
  if (body.name !== undefined) data.name = body.name;
  if (body.discountType !== undefined) data.discountType = body.discountType;
  if (body.discountValue !== undefined) data.discountValue = body.discountValue;
  if (body.minOrderAmount !== undefined)
    data.minOrderAmount = body.minOrderAmount || null;
  if (body.maxUses !== undefined) data.maxUses = body.maxUses || null;
  if (body.validUntil !== undefined)
    data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.productId !== undefined) data.productId = body.productId || null;
  if (body.minQuantity !== undefined)
    data.minQuantity = body.minQuantity || null;

  const promo = await prisma.promotion.update({ where: { id }, data });
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
