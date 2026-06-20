import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      orderNumber,
      items,
      grandTotal,
      subtotal,
      taxTotal,
      discountTotal,
      paymentMethod,
    } = body;

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 },
      );
    }

    if (!process.env.BREVO_API_KEY) {
      console.warn(
        "BREVO_API_KEY is not configured. Simulating email send in development.",
      );
      return NextResponse.json({
        ok: true,
        message: "Simulated email send (No API Key)",
      });
    }

    // Build the items list HTML
    const itemsHtml = items
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">₹${item.lineTotal.toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const discountHtml =
      discountTotal > 0
        ? `
      <tr>
        <td colspan="2" style="padding: 8px 0; text-align: right; color: #166534;">Discount</td>
        <td style="padding: 8px 0; text-align: right; color: #166534;">-₹${discountTotal.toFixed(2)}</td>
      </tr>
    `
        : "";

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="text-align: center; color: #1a1a2e;">☕ The Purple Cup Cafe</h2>
        <p style="text-align: center; color: #666;">Your Neighbourhood Café</p>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        
        <p><strong>Order #:</strong> ${orderNumber}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 10px; border-bottom: 2px solid #eee;">Item</th>
              <th style="text-align: center; padding-bottom: 10px; border-bottom: 2px solid #eee;">Qty</th>
              <th style="text-align: right; padding-bottom: 10px; border-bottom: 2px solid #eee;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 8px 0; text-align: right;">Subtotal</td>
              <td style="padding: 8px 0; text-align: right;">₹${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 8px 0; text-align: right;">Tax</td>
              <td style="padding: 8px 0; text-align: right;">₹${taxTotal.toFixed(2)}</td>
            </tr>
            ${discountHtml}
            <tr>
              <td colspan="2" style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px;">Total</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px;">₹${grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="text-align: center; font-size: 14px; color: #666;">Thank you for your visit!</p>
      </div>
    `;

    // Call Brevo REST API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "The Purple Cup Cafe", email: "receipts@cafeodoo.com" },
        to: [{ email: email }],
        subject: `Receipt for Order #${orderNumber} - The Purple Cup Cafe`,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Brevo error:", errorData || response.statusText);
      return NextResponse.json(
        {
          ok: false,
          error: errorData?.message || "Failed to send email via Brevo",
        },
        { status: 400 },
      );
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, data });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error sending receipt:", error);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
