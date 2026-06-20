import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginCustomer, signCustomerToken } from "@/lib/customer-auth";
import { customerLoginSchema } from "@/lib/validations/auth";
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
    const parsed = customerLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, password, tableId } = parsed.data;

    let table: { id: string; tableNumber: string; isActive: boolean } | null =
      null;
    if (tableId) {
      table = await prisma.table.findUnique({
        where: { id: tableId },
      });

      if (!table || !table.isActive) {
        return NextResponse.json(
          { ok: false, error: "Invalid table" },
          { status: 400 },
        );
      }
    }

    const customer = await loginCustomer({ email, password });

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

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastOrderAt: new Date() },
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
    const message = error instanceof Error ? error.message : "Login failed";
    const status = message === "Invalid credentials" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
