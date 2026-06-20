/* eslint-disable react-hooks/immutability */
"use client";

import { useState, useEffect } from "react";
import { CreditCard, QrCode, Banknote, Power } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  type: "CASH" | "UPI" | "CARD";
  isEnabled: boolean;
  upiId: string | null;
}

export function PaymentMethodManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    const res = await fetch("/api/payment-methods?all=true");
    const data = await res.json();
    setMethods(data.data || []);
    setLoading(false);
  };

  const toggleStatus = async (method: PaymentMethod) => {
    setSavingId(method.id);
    const res = await fetch(`/api/payment-methods/${method.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: !method.isEnabled }),
    });
    const data = await res.json();
    if (data.ok) {
      setMethods((prev) =>
        prev.map((m) => (m.id === method.id ? data.data : m)),
      );
    } else {
      alert(data.error || "Failed to update payment method status");
    }
    setSavingId(null);
  };

  const updateUpiId = async (id: string, newUpiId: string) => {
    setSavingId(id);
    const res = await fetch(`/api/payment-methods/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upiId: newUpiId }),
    });
    const data = await res.json();
    if (data.ok) {
      setMethods((prev) => prev.map((m) => (m.id === id ? data.data : m)));
    } else {
      alert(data.error || "Failed to update UPI ID");
    }
    setSavingId(null);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "CASH":
        return <Banknote size={24} color="#22c55e" />;
      case "UPI":
        return <QrCode size={24} color="#a855f7" />;
      case "CARD":
        return <CreditCard size={24} color="#3b82f6" />;
      default:
        return <CreditCard size={24} />;
    }
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>
          Payment Methods
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            color: "var(--color-text-faint)",
            fontSize: "14px",
          }}
        >
          Enable or disable the payment methods available in the POS and
          configure related settings.
        </p>
      </div>

      {loading ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--color-text-faint)",
          }}
        >
          Loading payment methods...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {methods.map((m) => (
            <div
              key={m.id}
              style={{
                background: "var(--color-bg-elevated)",
                border: `1px solid ${m.isEnabled ? "var(--color-border)" : "var(--color-border-muted)"}`,
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                opacity: m.isEnabled ? 1 : 0.6,
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "16px" }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: "var(--color-bg-overlay)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {getIcon(m.type)}
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "var(--color-text)",
                      }}
                    >
                      {m.name}
                    </h3>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-faint)",
                        marginTop: "2px",
                      }}
                    >
                      {m.type === "CASH" && "Accept physical cash payments"}
                      {m.type === "UPI" &&
                        "Display dynamic QR code for UPI apps"}
                      {m.type === "CARD" &&
                        "Process credit/debit cards via Razorpay"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleStatus(m)}
                  disabled={savingId === m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "999px",
                    border: "none",
                    background: m.isEnabled
                      ? "rgba(34,197,94,0.15)"
                      : "var(--color-bg-overlay)",
                    color: m.isEnabled ? "#22c55e" : "var(--color-text-muted)",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: savingId === m.id ? "not-allowed" : "pointer",
                  }}
                >
                  <Power size={16} />
                  {savingId === m.id
                    ? "Saving..."
                    : m.isEnabled
                      ? "Enabled"
                      : "Disabled"}
                </button>
              </div>

              {m.type === "UPI" && m.isEnabled && (
                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px dashed var(--color-border-muted)",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "var(--color-text)",
                    }}
                  >
                    UPI ID for QR Code
                  </label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="e.g. yourcafe@ybl"
                      defaultValue={m.upiId || ""}
                      onBlur={(e) => {
                        if (e.target.value !== m.upiId) {
                          updateUpiId(m.id, e.target.value);
                        }
                      }}
                      style={{
                        flex: 1,
                        maxWidth: "300px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                      }}
                    />
                    {savingId === m.id && (
                      <span
                        style={{
                          fontSize: "13px",
                          color: "var(--color-text-faint)",
                          alignSelf: "center",
                        }}
                      >
                        Saving...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
