import { NextResponse } from "next/server";
import { simulateOrderTotals } from "@/lib/order-recalc";

export async function POST(request: Request) {
  try {
    const { items, promotionId } = await request.json();
    const totals = await simulateOrderTotals(items || [], promotionId || null);
    return NextResponse.json({ ok: true, data: totals });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "Simulation failed" }, { status: 500 });
  }
}
