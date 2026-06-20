import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import Razorpay from "razorpay";

// POST /api/razorpay — Create a Razorpay Order
export async function POST(request: Request) {
  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Debug log — remove after confirming it works
  console.log("[Razorpay] KEY_ID present:", !!keyId, "| length:", keyId?.length ?? 0);
  console.log("[Razorpay] KEY_SECRET present:", !!keySecret, "| length:", keySecret?.length ?? 0);

  if (!keyId || keyId.trim() === "" || !keySecret || keySecret.trim() === "") {
    console.error("[Razorpay] Missing or empty RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
    return NextResponse.json(
      { ok: false, error: "Razorpay keys are missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env and restart." },
      { status: 503 }
    );
  }

  const { amount, currency = "INR", receipt } = await request.json();

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid amount" },
      { status: 400 }
    );
  }

  try {
    // Initialize inside the handler so env vars are always read at request time
    const razorpay = new Razorpay({ key_id: keyId.trim(), key_secret: keySecret.trim() });

    // Razorpay expects amount in paise (1 INR = 100 paise)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    });

    return NextResponse.json({
      ok: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: keyId.trim(),
      },
    });
  } catch (error: any) {
    // Razorpay SDK errors nest the description inside error.error.description
    const errMsg =
      error?.error?.description ||
      error?.message ||
      (typeof error === "string" ? error : JSON.stringify(error));
    console.error("[Razorpay] SDK error:", errMsg);
    return NextResponse.json(
      { ok: false, error: `Razorpay error: ${errMsg}` },
      { status: 500 }
    );
  }
}
