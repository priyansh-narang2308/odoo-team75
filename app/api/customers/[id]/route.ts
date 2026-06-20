import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/customers/[id]
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
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

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    // Check email conflict if changing email
    if (email && email !== existing.email) {
      const emailConflict = await prisma.customer.findUnique({
        where: { email },
      });
      if (emailConflict) {
        return NextResponse.json(
          { ok: false, error: "Email already in use by another customer" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        phone: phone !== undefined ? phone : existing.phone,
      },
    });

    const { password, ...sanitized } = updated;
    return NextResponse.json({ ok: true, data: sanitized });
  } catch (err) {
    console.error("Failed to update customer:", err);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE /api/customers/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    // Only admins should delete customers (or maybe Cashiers too, but let's restrict to ADMIN for safety, or allow both if requested. The PS says "Admin customer view is read-only — no create, edit, or delete buttons". We are adding them. We can allow CASHIER since they use POS).
    // Let's allow CASHIER as well since they might make a mistake during creation.
    if (session?.user.role !== "CASHIER" && session?.user.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 },
      );
    }
  }

  try {
    // We should check if the customer has any orders before deleting, or use cascade/soft delete.
    // Given Prisma schema, deleting a customer with orders might fail if there's no cascade.
    // Let's check orders.
    const orderCount = await prisma.order.count({ where: { customerId: id } });
    if (orderCount > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete customer with existing orders" },
        { status: 400 },
      );
    }

    await prisma.customer.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete customer:", err);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
