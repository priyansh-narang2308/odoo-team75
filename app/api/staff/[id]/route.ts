import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface RouteParams { params: Promise<{ id: string }> }

// PATCH /api/staff/[id]
export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, role, isActive, password } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  // UI sends isActive; schema uses isArchived (inverted)
  if (isActive !== undefined) data.isArchived = !isActive;
  if (password) data.password = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isArchived: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, data: { ...user, isActive: !user.isArchived } });
}

// DELETE /api/staff/[id]
export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  if (session.user.id === id)
    return NextResponse.json({ ok: false, error: "Cannot delete your own account" }, { status: 400 });

  // Soft-delete via archive
  await prisma.user.update({ where: { id }, data: { isArchived: true } });
  return NextResponse.json({ ok: true });
}
