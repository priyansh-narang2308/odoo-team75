/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createFloorSchema = z.object({
  name: z.string().min(1),
  gridWidth: z.number().int().min(1).max(50).default(12),
  gridHeight: z.number().int().min(1).max(50).default(8),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const floors = await prisma.floor.findMany({
    include: {
      _count: { select: { tables: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ ok: true, data: floors });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = createFloorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    const floor = await prisma.floor.create({
      data: parsed.data,
    });
    return NextResponse.json({ ok: true, data: floor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create floor" },
      { status: 500 },
    );
  }
}
