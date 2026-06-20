/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, generateRef } from "@/lib/utils";
import { UpiQrDisplay } from "@/components/shared/upi-qr-display";
import {
  QrCode,
  CreditCard,
  Loader2,
  ChevronLeft,
  AlertCircle,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  taxRate: number;
  quantity: number;
  notes?: string;
}

interface AppliedPromo {
  id: string;
  name: string;
  code: string | null;
  discountType: string;
  discountValue: number;
  discountAmount: number;
}

interface Props {
  tableId: string;
  cart: CartItem[];
  grandTotal: number;
  subtotal: number;
  taxTotal: number;
  customerName: string;
  onSuccess: (
    orderId: string,
    orderNumber: number,
    paymentMethod: string,
  ) => void;
  onBack: () => void;
}

type PaymentTab = "upi" | "razorpay";

export function CustomerPaymentSheet({
  tableId,
  cart,
  grandTotal: originalGrandTotal,
  taxTotal,
  customerName,
  onSuccess,
  onBack,
}: Props) {
  const [tab, setTab] = useState<PaymentTab>("razorpay");
  const [upiId, setUpiId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);

  // Coupon state
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [autoPromos, setAutoPromos] = useState<AppliedPromo[]>([]);

  // Computed final total with discount
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const grandTotal = Math.max(0, originalGrandTotal - discountAmount);

  const sv = {
    bg: "var(--color-bg)",
    card: "var(--color-bg-elevated)",
    border: "var(--color-border)",
    primary: "var(--color-primary)",
    text: "var(--color-text)",
    muted: "var(--color-text-muted)",
  };

  useEffect(() => {
    // Load UPI ID
    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const upi = d.data.find((m: any) => m.type === "UPI");
          if (upi) setUpiId(upi.upiId || "cafeodoo@upi");
        }
      });

    // Load Razorpay checkout.js
    if (window.Razorpay) {
      setRazorpayReady(true);
      return;
    }
    const existing = document.getElementById("razorpay-script");
    if (existing) {
      existing.addEventListener("load", () => setRazorpayReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setRazorpayReady(true);
    script.onerror = () =>
      setError("Failed to load Razorpay. Check your internet connection.");
    document.body.appendChild(script);

    // Fetch auto-applicable promotions
    const itemsQuery = encodeURIComponent(
      JSON.stringify(
        cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
        })),
      ),
    );
    fetch(
      `/api/promotions/auto?orderTotal=${originalGrandTotal}&items=${itemsQuery}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data.length > 0) {
          setAutoPromos(d.data);
          // Auto-apply the best promotion
          const best = d.data[0];
          setAppliedPromo({
            id: best.id,
            name: best.name,
            code: null,
            discountType: best.discountType,
            discountValue: best.discountValue,
            discountAmount: best.discountAmount,
          });
          setCouponSuccess(`🎉 "${best.name}" automatically applied!`);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply promo code manually
  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          orderTotal: originalGrandTotal,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setCouponError(data.error || "Invalid coupon code");
        return;
      }
      setAppliedPromo({
        id: data.data.id,
        name: data.data.name,
        code: data.data.code,
        discountType: data.data.discountType,
        discountValue: data.data.discountValue,
        discountAmount: data.data.discountAmount,
      });
      setCouponSuccess(
        `✅ Coupon applied! You save ${formatCurrency(data.data.discountAmount)}`,
      );
      setShowCouponInput(false);
    } catch {
      setCouponError("Failed to validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, originalGrandTotal]);

  const removePromo = () => {
    setAppliedPromo(null);
    setCouponCode("");
    setCouponError(null);
    setCouponSuccess(null);
  };

  // ── Create café order + items ──
  async function createCafeOrder(): Promise<{
    id: string;
    orderNumber: number;
  }> {
    const orderBody: Record<string, unknown> = { source: "CUSTOMER" };
    if (tableId) orderBody.tableId = tableId;
    if (appliedPromo) {
      orderBody.promotionId = appliedPromo.id;
      orderBody.discountTotal = appliedPromo.discountAmount;
    }

    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderBody),
    });
    const orderData = await orderRes.json();
    if (!orderData.ok)
      throw new Error(orderData.error || "Failed to create order");

    const orderId = orderData.data.id;
    const orderNumber = orderData.data.orderNumber;

    for (const item of cart) {
      const itemBody: Record<string, unknown> = {
        productId: item.productId,
        quantity: item.quantity,
      };
      if (item.notes) itemBody.notes = item.notes;

      const itemRes = await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemBody),
      });
      const itemData = await itemRes.json();
      if (!itemData.ok) console.warn("Item add warning:", itemData.error);
    }
    return { id: orderId, orderNumber };
  }

  // ── Razorpay checkout ──
  async function handleRazorpay() {
    if (!razorpayReady) {
      setError(
        "Payment SDK is still loading. Please wait a moment and try again.",
      );
      return;
    }
    setLoading(true);
    setError(null);

    let cafeOrderId: string | null = null;
    let cafeOrderNumber: number | null = null;

    try {
      // 1. Create Razorpay order with discounted amount
      const rzpRes = await fetch("/api/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: grandTotal,
          receipt: `c_${tableId.substring(0, 8)}_${Date.now()}`,
        }),
      });
      const rzpData = await rzpRes.json();
      if (!rzpData.ok)
        throw new Error(rzpData.error || "Failed to create payment order");

      // 2. Create café order
      const { id, orderNumber } = await createCafeOrder();
      cafeOrderId = id;
      cafeOrderNumber = orderNumber;

      // 3. Open Razorpay checkout
      const options = {
        key: rzpData.data.keyId,
        amount: rzpData.data.amount,
        currency: "INR",
        name: "Café Odoo",
        description: `Table Order #${cafeOrderNumber}`,
        order_id: rzpData.data.orderId,
        prefill: { name: customerName },
        theme: { color: "var(--color-primary)" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                cafeOrderId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.ok) {
              setError(
                "Payment verification failed. Please show your payment receipt to staff.",
              );
              setLoading(false);
              return;
            }
            // Send to kitchen
            await fetch(`/api/orders/${cafeOrderId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "SENT" }),
            });
            onSuccess(cafeOrderId!, cafeOrderNumber!, "Razorpay");
          } catch {
            setError(
              "An error occurred after payment. Please show your payment receipt to staff.",
            );
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setError(
          `Payment failed: ${response.error?.description || "Unknown error"}. Please try again.`,
        );
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      const msg =
        err?.error?.description ||
        err?.message ||
        "Something went wrong. Please try again.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: sv.bg,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "var(--color-bg-overlay)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${sv.border}`,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 10,
        }}
      >
        <button
          id="payment-back-btn"
          onClick={onBack}
          style={{
            background: sv.border,
            border: "none",
            color: sv.muted,
            padding: "8px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: sv.text }}>
            Payment
          </div>
          <div style={{ fontSize: "12px", color: sv.muted }}>
            {cart.length} item{cart.length !== 1 ? "s" : ""} · {customerName}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div
            style={{ fontSize: "20px", fontWeight: "800", color: sv.primary }}
          >
            {formatCurrency(grandTotal)}
          </div>
          {discountAmount > 0 && (
            <div
              style={{
                fontSize: "12px",
                color: sv.muted,
                textDecoration: "line-through",
              }}
            >
              {formatCurrency(originalGrandTotal)}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "20px 16px",
          maxWidth: "480px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Order Summary */}
        <div
          style={{
            background: sv.card,
            border: `1px solid ${sv.border}`,
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: sv.muted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "10px",
            }}
          >
            Order Summary
          </div>
          {cart.map((item) => (
            <div
              key={item.productId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "14px",
                padding: "4px 0",
                color: sv.text,
              }}
            >
              <span>
                ×{item.quantity} {item.name}
              </span>
              <span style={{ color: sv.muted }}>
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
          <div
            style={{
              borderTop: `1px solid ${sv.border}`,
              marginTop: "10px",
              paddingTop: "10px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13px",
              color: sv.muted,
            }}
          >
            <span>Tax</span>
            <span>{formatCurrency(taxTotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
                color: "#4ade80",
                marginTop: "6px",
                fontWeight: "600",
              }}
            >
              <span>🎉 Discount ({appliedPromo?.name})</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "800",
              fontSize: "17px",
              marginTop: "8px",
              color: sv.text,
            }}
          >
            <span>Total</span>
            <span style={{ color: sv.primary }}>
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* ── COUPON SECTION ── */}
        <div style={{ marginBottom: "16px" }}>
          {/* Auto-applied / applied promo banner */}
          {appliedPromo && (
            <div
              style={{
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.3)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "20px" }}>🎁</div>
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#4ade80",
                    }}
                  >
                    {appliedPromo.code
                      ? `Code: ${appliedPromo.code}`
                      : "🌟 Automatic Offer"}{" "}
                    — {appliedPromo.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: sv.muted,
                      marginTop: "2px",
                    }}
                  >
                    {appliedPromo.discountType === "PERCENTAGE"
                      ? `${appliedPromo.discountValue}% off`
                      : `₹${appliedPromo.discountValue} off`}
                    {" · "}You save{" "}
                    {formatCurrency(appliedPromo.discountAmount)}!
                  </div>
                </div>
              </div>
              <button
                onClick={removePromo}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#f87171",
                  padding: "4px",
                  cursor: "pointer",
                  flexShrink: 0,
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Promo code entry toggle */}
          {!appliedPromo && (
            <button
              id="toggle-coupon-input-cust"
              onClick={() => setShowCouponInput((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(var(--color-primary-rgb),0.06)",
                border: `1px solid rgba(var(--color-primary-rgb),0.2)`,
                borderRadius: "12px",
                color: sv.primary,
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                marginBottom: "10px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <Tag size={16} />
                Have a promo code?
              </div>
              {showCouponInput ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
          )}

          {/* Promo code input */}
          {showCouponInput && !appliedPromo && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="cust-coupon-code-input"
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  placeholder="Enter promo code"
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${couponError ? "#ef4444" : sv.border}`,
                    color: sv.text,
                    fontSize: "15px",
                    fontWeight: "600",
                    letterSpacing: "0.05em",
                    outline: "none",
                  }}
                />
                <button
                  id="cust-apply-coupon-btn"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  style={{
                    padding: "12px 20px",
                    borderRadius: "12px",
                    background:
                      couponLoading || !couponCode.trim()
                        ? sv.border
                        : "var(--color-primary)",
                    color:
                      couponLoading || !couponCode.trim() ? sv.muted : "#fff",
                    border: "none",
                    fontWeight: "700",
                    fontSize: "14px",
                    cursor:
                      couponLoading || !couponCode.trim()
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {couponLoading ? (
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : null}
                  Apply
                </button>
              </div>
              {couponError && (
                <p
                  style={{
                    color: "#f87171",
                    fontSize: "13px",
                    marginTop: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AlertCircle size={13} /> {couponError}
                </p>
              )}
            </div>
          )}

          {/* Dismissed auto-promo reminder */}
          {!appliedPromo && autoPromos.length > 0 && (
            <div
              style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.25)",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={14} /> Offer available!
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: sv.muted,
                  margin: "4px 0 8px",
                }}
              >
                Apply &ldquo;{autoPromos[0].name}&rdquo; to save{" "}
                {formatCurrency(autoPromos[0].discountAmount)}
              </div>
              <button
                onClick={() => {
                  setAppliedPromo(autoPromos[0]);
                  setCouponSuccess(`🎉 Applied!`);
                }}
                style={{
                  background: "rgba(251,191,36,0.15)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fbbf24",
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Apply offer
              </button>
            </div>
          )}

          {/* Success message */}
          {couponSuccess && (
            <div
              style={{
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.25)",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#4ade80",
                fontWeight: "600",
                marginBottom: "4px",
              }}
            >
              {couponSuccess}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "10px",
              padding: "12px 14px",
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "16px",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            <AlertCircle
              size={15}
              style={{ flexShrink: 0, marginTop: "1px" }}
            />
            {error}
          </div>
        )}

        {/* Payment method tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {[
            {
              key: "razorpay" as PaymentTab,
              label: "Razorpay",
              icon: <CreditCard size={14} />,
            },
            {
              key: "upi" as PaymentTab,
              label: "UPI QR",
              icon: <QrCode size={14} />,
            },
          ].map((t) => (
            <button
              key={t.key}
              id={`cust-pay-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "11px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "700",
                border: `1px solid ${tab === t.key ? sv.primary : sv.border}`,
                background:
                  tab === t.key
                    ? `rgba(var(--color-primary-rgb),0.15)`
                    : "transparent",
                color: tab === t.key ? sv.primary : sv.muted,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Razorpay Tab ── */}
        {tab === "razorpay" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              style={{
                background: sv.card,
                border: `1px solid ${sv.border}`,
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>💳</div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: sv.text,
                  marginBottom: "8px",
                }}
              >
                Pay with Razorpay
              </div>
              <div
                style={{ fontSize: "13px", color: sv.muted, lineHeight: "1.6" }}
              >
                Card · Net Banking · Wallets · UPI
                <br />
                Secured &amp; encrypted checkout
              </div>
              {discountAmount > 0 && (
                <div
                  style={{
                    marginTop: "14px",
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.25)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    color: "#4ade80",
                    fontWeight: "600",
                  }}
                >
                  🎉 {formatCurrency(discountAmount)} discount applied!
                </div>
              )}
            </div>

            <button
              id="cust-razorpay-btn"
              onClick={handleRazorpay}
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "14px",
                background: loading
                  ? "var(--color-bg-overlay)"
                  : "linear-gradient(135deg, #072654, #1a3c7e)",
                color: loading ? "var(--color-text-muted)" : "#fff",
                fontWeight: "700",
                fontSize: "16px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 8px 24px rgba(7,38,84,0.4)",
              }}
            >
              {loading ? (
                <Loader2
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <CreditCard size={18} />
              )}
              {loading
                ? "Opening checkout..."
                : `Pay ${formatCurrency(grandTotal)}`}
            </button>

            <p
              style={{
                margin: 0,
                fontSize: "11px",
                color: sv.muted,
                textAlign: "center",
              }}
            >
              Your order will be confirmed after payment is verified.
            </p>
          </div>
        )}

        {/* ── UPI Tab — show QR only, staff confirms ── */}
        {tab === "upi" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              style={{
                background: sv.card,
                border: `1px solid ${sv.border}`,
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {upiId ? (
                <UpiQrDisplay upiId={upiId} amount={grandTotal} />
              ) : (
                <div
                  style={{
                    color: sv.muted,
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  UPI not configured. Please ask staff.
                </div>
              )}
              {discountAmount > 0 && (
                <div
                  style={{
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.25)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    color: "#4ade80",
                    fontWeight: "600",
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  🎉 Discount applied — pay only {formatCurrency(grandTotal)}
                </div>
              )}
            </div>

            {/* Info banner */}
            <div
              style={{
                background: "rgba(var(--color-primary-rgb),0.08)",
                border: "1px solid rgba(var(--color-primary-rgb),0.25)",
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <AlertCircle
                size={16}
                style={{ color: sv.primary, flexShrink: 0, marginTop: "1px" }}
              />
              <div
                style={{ fontSize: "13px", color: sv.text, lineHeight: "1.5" }}
              >
                <strong>After paying</strong>, show your UPI app payment
                confirmation to the staff. They will confirm and send your order
                to the kitchen.
                <br />
                <span style={{ color: sv.muted, fontSize: "12px" }}>
                  Or switch to Razorpay for instant auto-confirmation.
                </span>
              </div>
            </div>

            <button
              id="switch-to-razorpay-btn"
              onClick={() => setTab("razorpay")}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "12px",
                background: `rgba(var(--color-primary-rgb),0.15)`,
                color: sv.primary,
                fontWeight: "600",
                fontSize: "14px",
                border: "1px solid var(--color-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <CreditCard size={15} />
              Switch to Razorpay for instant confirmation
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
