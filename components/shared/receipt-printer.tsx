"use client";

import { Printer, X, Mail, Send } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface ReceiptProps {
  orderNumber: number;
  tableNumber?: string;
  floorName?: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paidAt: Date;
  onClose: () => void;
}

export function ReceiptPrinter({
  orderNumber,
  tableNumber,
  floorName,
  customerName,
  items,
  subtotal,
  taxTotal,
  discountTotal,
  grandTotal,
  paymentMethod,
  paidAt,
  onClose,
}: ReceiptProps) {
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // Open receipt in a new window for printing — avoids blank page bug
  const handlePrint = () => {
    const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt #${orderNumber} — The Purple Cup Cafe</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; color: #111; background: #fff; padding: 20px; max-width: 340px; margin: 0 auto; }
    .cafe-header { text-align: center; margin-bottom: 16px; }
    .cafe-name { font-size: 20px; font-weight: 900; letter-spacing: 0.06em; }
    .cafe-sub { font-size: 12px; color: #666; margin-top: 4px; }
    .divider { border: none; border-top: 1px dashed #aaa; margin: 12px 0; }
    .meta-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
    .meta-label { color: #555; }
    .items-header { display: grid; grid-template-columns: 1fr auto auto; gap: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #888; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
    .item-row { display: grid; grid-template-columns: 1fr auto auto; gap: 4px 10px; font-size: 13px; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
    .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
    .total-row.grand { font-size: 18px; font-weight: 900; border-top: 2px solid #111; margin-top: 8px; padding-top: 8px; }
    .footer { text-align: center; margin-top: 16px; font-size: 12px; color: #777; line-height: 1.6; }
    .paid-badge { color: #166534; font-weight: 700; }
    .discount { color: #166534; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="cafe-header">
    <div style="font-size:28px;margin-bottom:6px">☕</div>
    <div class="cafe-name">The Purple Cup Cafe</div>
    <div class="cafe-sub">Your Neighbourhood Café</div>
  </div>
  <hr class="divider" />
  <div class="meta-row"><span class="meta-label">Order #</span><strong>${orderNumber}</strong></div>
  ${tableNumber ? `<div class="meta-row"><span class="meta-label">Table</span><strong>${floorName ? floorName + " · " : ""}T${tableNumber}</strong></div>` : ""}
  ${customerName ? `<div class="meta-row"><span class="meta-label">Guest</span><strong>${customerName}</strong></div>` : ""}
  <div class="meta-row"><span class="meta-label">Date</span><span>${new Date(paidAt).toLocaleString("en-IN")}</span></div>
  <div class="meta-row"><span class="meta-label">Payment</span><strong class="paid-badge">${paymentMethod}</strong></div>
  <hr class="divider" />
  <div class="items-header"><span>Item</span><span>Qty</span><span>Total</span></div>
  ${items
    .map(
      (item) => `
    <div class="item-row">
      <span>${item.name}</span>
      <span style="text-align:center">×${item.quantity}</span>
      <span style="text-align:right">₹${item.lineTotal.toFixed(2)}</span>
    </div>
  `,
    )
    .join("")}
  <hr class="divider" />
  <div class="total-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
  <div class="total-row"><span>Tax</span><span>₹${taxTotal.toFixed(2)}</span></div>
  ${discountTotal > 0 ? `<div class="total-row discount"><span>Discount</span><span>−₹${discountTotal.toFixed(2)}</span></div>` : ""}
  <div class="total-row grand"><span>TOTAL</span><span>₹${grandTotal.toFixed(2)}</span></div>
  <div class="footer">
    <div>✓ Payment Received</div>
    <div style="margin-top:8px">Thank you for visiting!</div>
    <div>We hope to see you again ☕</div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    win.document.write(printHtml);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const sv = {
    card: "#ffffff",
    border: "#e5e7eb",
    text: "#1a1a1a",
    muted: "#6b7280",
    primary: "#1a1a2e",
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.8)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        {/* Receipt card */}
        <div
          style={{
            background: sv.card,
            color: sv.text,
            borderRadius: "16px",
            maxWidth: "380px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            fontFamily: "'Courier New', monospace",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: sv.primary,
              color: "#fff",
              padding: "24px 20px 20px",
              borderRadius: "16px 16px 0 0",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "6px" }}>☕</div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "800",
                letterSpacing: "0.05em",
              }}
            >
              The Purple Cup Cafe
            </div>
            <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
              Your Neighbourhood Café
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "20px" }}>
            {/* Meta */}
            <div
              style={{
                borderBottom: "1px dashed #ddd",
                paddingBottom: "12px",
                marginBottom: "12px",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: sv.muted }}>Order #</span>
                <span style={{ fontWeight: "700" }}>{orderNumber}</span>
              </div>
              {(tableNumber || floorName) && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: sv.muted }}>Table</span>
                  <span style={{ fontWeight: "700" }}>
                    {floorName ? `${floorName} · ` : ""}T{tableNumber}
                  </span>
                </div>
              )}
              {customerName && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: sv.muted }}>Guest</span>
                  <span style={{ fontWeight: "700" }}>{customerName}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: sv.muted }}>Date</span>
                <span>{new Date(paidAt).toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: sv.muted }}>Payment</span>
                <span style={{ fontWeight: "700", color: "#166534" }}>
                  {paymentMethod}
                </span>
              </div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: "4px 12px",
                  fontSize: "11px",
                  color: sv.muted,
                  paddingBottom: "6px",
                  borderBottom: "1px solid #eee",
                  marginBottom: "6px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                }}
              >
                <span>Item</span>
                <span style={{ textAlign: "center" }}>Qty</span>
                <span style={{ textAlign: "right" }}>Total</span>
              </div>
              {items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: "4px 12px",
                    fontSize: "13px",
                    padding: "4px 0",
                    borderBottom: "1px solid #f5f5f5",
                  }}
                >
                  <span>{item.name}</span>
                  <span style={{ textAlign: "center" }}>×{item.quantity}</span>
                  <span style={{ textAlign: "right" }}>
                    ₹{item.lineTotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div
              style={{
                borderTop: "1px dashed #ddd",
                paddingTop: "12px",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                  color: sv.muted,
                }}
              >
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                  color: sv.muted,
                }}
              >
                <span>Tax</span>
                <span>₹{taxTotal.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                    color: "#166534",
                  }}
                >
                  <span>Discount</span>
                  <span>−₹{discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "800",
                  fontSize: "18px",
                  paddingTop: "10px",
                  borderTop: "2px solid #1a1a1a",
                  marginTop: "8px",
                }}
              >
                <span>TOTAL</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                textAlign: "center",
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px dashed #ddd",
                fontSize: "12px",
                color: sv.muted,
                lineHeight: "1.6",
              }}
            >
              <div>✓ Payment Received</div>
              <div style={{ marginTop: "8px" }}>Thank you for visiting!</div>
              <div>We hope to see you again ☕</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              padding: "16px 20px",
              borderTop: "1px solid #eee",
              borderRadius: "0 0 16px 16px",
              background: "#f9fafb",
            }}
          >
            <button
              id="print-receipt-btn"
              onClick={handlePrint}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                borderRadius: "10px",
                background: sv.primary,
                color: "#fff",
                fontWeight: "700",
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Printer size={15} />
              Print Receipt
            </button>
            <button
              id="email-receipt-btn"
              onClick={() => setShowEmailPrompt(true)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                borderRadius: "10px",
                background: "rgba(34, 197, 94, 0.1)",
                color: "#16a34a",
                fontWeight: "700",
                fontSize: "14px",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                cursor: "pointer",
              }}
            >
              <Mail size={15} />
              Email Receipt
            </button>
            <button
              id="close-receipt-btn"
              onClick={() => {
                toast.success("Order has been sent to the Kitchen! 👨‍🍳");
                onClose();
              }}
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#f0f0f0",
                color: "#666",
                fontWeight: "600",
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <X size={14} />
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Custom Email Prompt Modal */}
      {showEmailPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              padding: "24px",
              borderRadius: "16px",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  color: "var(--color-text)",
                }}
              >
                Email Receipt
              </h3>
              <button
                onClick={() => setShowEmailPrompt(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "14px",
                color: "var(--color-text-muted)",
              }}
            >
              Enter the customer&apos;s email address to send them a digital
              copy of their receipt.
            </p>

            <input
              type="email"
              placeholder="customer@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-overlay)",
                color: "var(--color-text)",
                marginBottom: "20px",
                fontSize: "15px",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && emailInput.trim()) {
                  document.getElementById("send-email-confirm-btn")?.click();
                }
              }}
            />

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowEmailPrompt(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid var(--color-border-muted)",
                  color: "var(--color-text)",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                id="send-email-confirm-btn"
                disabled={!emailInput.trim()}
                onClick={() => {
                  const email = emailInput.trim();
                  if (email) {
                    const sendEmailPromise = fetch("/api/email/receipt", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email,
                        orderNumber,
                        items,
                        grandTotal,
                        subtotal,
                        taxTotal,
                        discountTotal,
                        paymentMethod,
                      }),
                    }).then(async (res) => {
                      const data = await res.json();
                      if (!data.ok)
                        throw new Error(data.error || "Failed to send");
                      return data;
                    });

                    toast.promise(sendEmailPromise, {
                      loading: "Sending receipt... ✉️",
                      success: `Receipt sent to ${email} ✅`,
                      error: (err) =>
                        err.message || "Failed to send receipt ❌",
                    });

                    setShowEmailPrompt(false);
                    setEmailInput("");
                  }
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  background: "var(--color-primary)",
                  border: "none",
                  color: "white",
                  fontWeight: "600",
                  cursor: emailInput.trim() ? "pointer" : "not-allowed",
                  opacity: emailInput.trim() ? 1 : 0.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Send size={16} />
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
