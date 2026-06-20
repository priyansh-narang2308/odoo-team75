import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.storeSetting.findFirst();
    if (!settings) {
      settings = await prisma.storeSetting.create({ data: {} });
    }
    return NextResponse.json({ ok: true, data: settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    let settings = await prisma.storeSetting.findFirst();
    if (!settings) {
      settings = await prisma.storeSetting.create({ data: body });
    } else {
      settings = await prisma.storeSetting.update({
        where: { id: settings.id },
        data: body,
      });
    }
    return NextResponse.json({ ok: true, data: settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
