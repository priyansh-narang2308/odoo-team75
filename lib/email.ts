const FROM_EMAIL =
  process.env.SMTP_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  "receipt@cafeodoo.com";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "The Purple Cup Cafe";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SendReceiptOptions {
  to: string;
  customerName: string;
  orderNumber: number;
  tableNumber?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paidAt: Date;
}

export async function sendReceiptEmail(opts: SendReceiptOptions) {
  const itemsHtml = opts.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">₹${item.lineTotal.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 32px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 8px 0 0; opacity: 0.7; font-size: 14px; }
    .body { background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; }
    .order-meta { background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .order-meta p { margin: 4px 0; font-size: 14px; color: #6b7280; }
    .order-meta strong { color: #1a1a1a; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 8px 0; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    th:not(:first-child) { text-align: right; }
    .totals { margin-top: 16px; }
    .totals tr td { padding: 4px 0; font-size: 14px; }
    .totals tr td:last-child { text-align: right; }
    .grand-total td { font-size: 18px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #1a1a1a; padding-top: 12px !important; }
    .footer { background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e5e7eb; border-top: none; }
    .footer p { margin: 4px 0; font-size: 13px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>☕ The Purple Cup Cafe</h1>
      <p>Thank you for your visit!</p>
    </div>
    <div class="body">
      <div class="order-meta">
        <p><strong>Order #${opts.orderNumber}</strong></p>
        ${opts.tableNumber ? `<p>Table: <strong>${opts.tableNumber}</strong></p>` : ""}
        <p>Date: <strong>${opts.paidAt.toLocaleDateString("en-IN", { dateStyle: "long" })}</strong></p>
        <p>Payment: <strong>${opts.paymentMethod}</strong></p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <table class="totals">
        <tr>
          <td>Subtotal</td>
          <td>₹${opts.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Tax</td>
          <td>₹${opts.taxTotal.toFixed(2)}</td>
        </tr>
        ${
          opts.discountTotal > 0
            ? `<tr><td>Discount</td><td>-₹${opts.discountTotal.toFixed(2)}</td></tr>`
            : ""
        }
        <tr class="grand-total">
          <td>Grand Total</td>
          <td>₹${opts.grandTotal.toFixed(2)}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <p>We hope to see you again soon! ☕</p>
      <p>The Purple Cup Cafe • Your neighbourhood café</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: FROM_NAME,
          email: FROM_EMAIL,
        },
        to: [
          {
            email: opts.to,
            name: opts.customerName || "Customer",
          },
        ],
        subject: `Your Order #${opts.orderNumber} at The Purple Cup Cafe is confirmed! ☕`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(
        "[Email] Brevo API error:",
        errorData || response.statusText,
      );
      throw new Error(`Brevo API failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(
      `[Email] Successfully sent receipt to ${opts.to}. Message ID: ${data.messageId}`,
    );
    return data;
  } catch (error) {
    console.error("[Email] Failed to send receipt:", error);
    throw new Error("Failed to send receipt email");
  }
}
