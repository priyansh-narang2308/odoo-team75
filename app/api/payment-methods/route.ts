import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  const methods = await prisma.paymentMethod.findMany({
    where: all ? {} : { isEnabled: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, data: methods });
}
