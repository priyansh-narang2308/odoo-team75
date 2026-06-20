import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
  const { isEnabled, upiId } = body;

  try {
    const paymentMethod = await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(isEnabled !== undefined && { isEnabled }),
        ...(upiId !== undefined && { upiId }),
      },
    });

    return NextResponse.json({ ok: true, data: paymentMethod });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to update payment method" },
      { status: 500 },
    );
  }
}
