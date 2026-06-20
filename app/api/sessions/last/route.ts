import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const staffSession = await getServerSession(authOptions);

  if (!staffSession) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the latest closed session for this user
    const session = await prisma.session.findFirst({
      where: {
        userId: staffSession.user.id,
        closedAt: { not: null },
      },
      orderBy: {
        closedAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, data: session });
  } catch (error) {
    console.error("Failed to fetch last session", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch session" }, { status: 500 });
  }
}
