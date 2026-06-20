import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { registerCustomer, signCustomerToken } from "@/lib/customer-auth";
import { customerRegisterSchema } from "@/lib/validations/auth";
import { rateLimitAuth } from "@/lib/cache/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimitAuth(ip);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsed = customerRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, email, password, tableId } = parsed.data;

    let table: {
      id: string;
      tableNumber: string;
      isActive: boolean;
      floor: { name: string };
    } | null = null;
    if (tableId) {
      table = await prisma.table.findUnique({
        where: { id: tableId },
        include: { floor: true },
      });

      if (!table || !table.isActive) {
        return NextResponse.json(
          { ok: false, error: "Invalid table" },
          { status: 400 },
        );
      }
    }

    const customer = await registerCustomer({
      name,
      email,
      password,
      tableId: tableId || "none",
    });

    const token = await signCustomerToken({
      customerId: customer.id,
      tableId: table?.id || "none",
      name: customer.name,
      email: customer.email,
    });

    const cookieStore = await cookies();
    cookieStore.set("customer_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        tableId: table?.id || null,
        tableNumber: table?.tableNumber || null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    const status = message === "Email already registered" ? 409 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
