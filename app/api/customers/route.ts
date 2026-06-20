import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/customers
export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    // Map and sanitize to exclude passwords
    const sanitized = customers.map((c) => {
      const { ...rest } = c;
      return {
        ...rest,
        orderCount: c._count.orders,
      };
    });

    return NextResponse.json({ ok: true, data: sanitized });
  } catch (err) {
    console.error("Failed to fetch customers:", err);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST /api/customers
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || !email) {
      return NextResponse.json(
        { ok: false, error: "Name and email are required" },
        { status: 400 },
      );
    }

    if (phone) {
      const cleanPhone = phone.trim();
      if (cleanPhone) {
        const digits = cleanPhone.replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) {
          return NextResponse.json(
            {
       ok: false,
    error: "Phone number must contain between 10 and 15 digits",
            },
      { status: 400 },
          );
        }
  const phoneRegex = /^\+?[0-9\s\-()]+$/;
    if (!phoneRegex.test(cleanPhone)) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Phone number contains invalid characters. Use digits, spaces, hyphens, parentheses, or a leading +.",
            },
            { status: 400 },
          );
        }
      }
    }

    // Check if email exists
    const existing = await prisma.customer.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Customer with this email already exists" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: "placeholder", // Required by schema but not used for walk-ins
      },
    });

    const { ...sanitized } = customer;
    return NextResponse.json({ ok: true, data: sanitized }, { status: 201 });
  } catch (err) {
    console.error("Failed to create customer:", err);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
