import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProductSchema } from "@/lib/validations/product";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/products/[id]
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product) {
    return NextResponse.json(
      { ok: false, error: "Product not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: product });
}

// PATCH /api/products/[id]
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const product = await prisma.product.update({
    where: { id },
    data: parsed.data,
    include: { category: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json({ ok: true, data: product });
}

// DELETE /api/products/[id] — Soft delete (archive)
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  await prisma.product.update({
    where: { id },
    data: { isArchived: true },
  });

  return NextResponse.json({ ok: true, data: null });
}
