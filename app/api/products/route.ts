import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/lib/validations/product";

// GET /api/products — Get all available products
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const availableOnly = searchParams.get("available") !== "false";

  const where = {
    isArchived: false,
    ...(availableOnly && { isAvailable: true }),
    ...(categoryId && { categoryId }),
    ...(search && {
      name: { contains: search, mode: "insensitive" as const },
    }),
  };

  const products = await prisma.product.findMany({
    where,
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({ ok: true, data: products });
}

// POST /api/products — Create a new product (Admin only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        price: parsed.data.price,
        taxRate: parsed.data.taxRate,
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json({ ok: true, data: product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}
