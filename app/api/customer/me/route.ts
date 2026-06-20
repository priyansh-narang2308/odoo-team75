import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  if (!customer) {
    return NextResponse.json(
      { ok: false, error: "Customer not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: { ...customer, tableId: session.tableId },
  });
}

export async function DELETE() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete("customer_session");
  return NextResponse.json({ ok: true, data: null });
}
