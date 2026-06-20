import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    const [employees, sessions, products] = await Promise.all([
      // Fetch employees
      prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      // Fetch last 50 sessions
      prisma.session.findMany({
        take: 50,
        orderBy: { openedAt: "desc" },
        include: { user: { select: { name: true } } },
      }),

      // Fetch products
      prisma.product.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Format sessions to display date and user
    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      name: `${s.user.name} - ${new Date(s.openedAt).toLocaleDateString()} ${new Date(s.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        employees,
        sessions: formattedSessions,
        products,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch filters" },
      { status: 500 },
    );
  }
}
