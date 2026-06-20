import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/staff
export async function GET(req : NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });

  const staff = await prisma.user.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, isArchived: true, createdAt: true },
  });

  // Map isArchived → isActive for the UI
  const mapped = staff.map((s) => ({ ...s, isActive: !s.isArchived }));
  return NextResponse.json({ ok: true, data: mapped });
}

// POST /api/staff
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });

  const { name, email, role, password } = await req.json();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ ok: false, error: "Email already in use" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, role, password: hashed },
    select: { id: true, name: true, email: true, role: true, isArchived: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, data: { ...user, isActive: !user.isArchived } });
}

