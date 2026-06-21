import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signCustomerToken } from "@/lib/customer-auth";

export async function POST(request: Request) {
  try {
    const { tableId, tableNumber } = await request.json();

    if (!tableId || !tableNumber) {
      return NextResponse.json(
        { ok: false, error: "Missing tableId or tableNumber" },
        { status: 400 },
      );
    }

    const guestId = `guest_${Math.random().toString(36).substring(7)}`;
    const guestName = `Guest (Table ${tableNumber})`;
    const guestEmail = "guest@thepurplecup.com";

    const token = await signCustomerToken({
      customerId: guestId,
      tableId,
      name: guestName,
      email: guestEmail,
    });

    const cookieStore = await cookies();
    cookieStore.set("customer_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: guestId,
        name: guestName,
        email: guestEmail,
        tableId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to create guest session" },
      { status: 500 },
    );
  }
}
