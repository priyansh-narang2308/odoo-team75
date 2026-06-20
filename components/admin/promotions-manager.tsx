/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Percent, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface Promotion {
  id: string;
  code: string | null;
  name: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  validUntil: string | null;
  productId: string | null;
  minQuantity: number | null;
  createdAt: string;
}

export function PromotionsManager() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discountValue: "",
    minOrderAmount: "",
    maxUses: "",
    validUntil: "",
    isActive: true,
    productId: "",
    minQuantity: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/promotions").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([promosData, productsData]) => {
      setPromos(promosData.data || []);
      setProducts(productsData.data || []);
      setLoading(false);
    });
  }, []);

  const openAdd = () => {
    setForm({
      code: "",
      name: "",
      discountType: "PERCENTAGE",
      discountValue: "",
      minOrderAmount: "",
      maxUses: "",
      validUntil: "",
      isActive: true,
      productId: "",
      minQuantity: "",
    });
    setEditPromo(null);
    setShowModal(true);
  };

  const openEdit = (p: Promotion) => {
    setForm({
      code: p.code || "",
      name: p.name,
      discountType: p.discountType,
      discountValue: String(p.discountValue),
      minOrderAmount: p.minOrderAmount ? String(p.minOrderAmount) : "",
      maxUses: p.maxUses ? String(p.maxUses) : "",
      validUntil: p.validUntil ? p.validUntil.split("T")[0] : "",
      isActive: p.isActive,
      productId: p.productId || "",
      minQuantity: p.minQuantity ? String(p.minQuantity) : "",
    });
    setEditPromo(p);
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase() || null,
      name: form.name,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      minOrderAmount: form.minOrderAmount
        ? parseFloat(form.minOrderAmount)
        : null,
      productId: form.productId || null,
      minQuantity: form.minQuantity ? parseInt(form.minQuantity) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      validUntil: form.validUntil
        ? new Date(form.validUntil).toISOString()
        : null,
      isActive: form.isActive,
    };
    try {
      if (editPromo) {
        const res = await fetch(`/api/promotions/${editPromo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setPromos((prev) =>
          prev.map((p) => (p.id === editPromo.id ? data.data : p)),
        );
      } else {
        const res = await fetch("/api/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setPromos((prev) => [data.data, ...prev]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    await fetch(`/api/promotions/${id}`, { method: "DELETE" });
    setPromos((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleActive = async (p: Promotion) => {
    const res = await fetch(`/api/promotions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    const data = await res.json();
    setPromos((prev) => prev.map((pr) => (pr.id === p.id ? data.data : pr)));
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1100px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>
          Promotions
        </h1>
        <button
          id="add-promo-btn"
          onClick={openAdd}
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(var(--color-primary-rgb),0.3)",
          }}
        >
          <Plus size={16} /> New Promotion
        </button>
      </div>

      {loading && (
        <p style={{ color: "var(--color-text-faint)" }}>Loading...</p>
      )}

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
        }}
      >
        {promos.map((p) => {
          const isExpired = p.validUntil && new Date(p.validUntil) < new Date();
          const usagePct = p.maxUses
            ? Math.min(100, (p.usedCount / p.maxUses) * 100)
            : 0;
          return (
            <div
              key={p.id}
              className="card"
              style={{
                padding: "20px",
                border: `1px solid ${p.isActive && !isExpired ? "rgba(var(--color-primary-rgb),0.3)" : "var(--color-border)"}`,
                opacity: p.isActive && !isExpired ? 1 : 0.6,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "rgba(var(--color-primary-rgb),0.06)",
                }}
              />

              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "14px",
                }}
              >
                <div>
                  {p.code && (
                    <code
                      style={{
                        fontSize: "16px",
                        fontWeight: "800",
                        color: "var(--color-primary)",
                        background: "rgba(var(--color-primary-rgb),0.12)",
                        padding: "3px 10px",
                        borderRadius: "8px",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {p.code}
                    </code>
                  )}
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {p.name}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    id={`edit-promo-${p.id}`}
                    onClick={() => openEdit(p)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "7px",
                      background: "var(--color-bg-overlay)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    id={`del-promo-${p.id}`}
                    onClick={() => deletePromo(p.id)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "7px",
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Value */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "22px",
                    fontWeight: "800",
                    color: "var(--color-text)",
                  }}
                >
                  {p.discountType === "PERCENTAGE" ? (
                    <Percent size={16} color="var(--color-primary)" />
                  ) : (
                    <IndianRupee size={16} color="#22c55e" />
                  )}
                  {Number(p.discountValue)}
                  {p.discountType === "PERCENTAGE" ? "% OFF" : " OFF"}
                </span>
                {p.minOrderAmount && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-faint)",
                      background: "var(--color-bg-overlay)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    Min Order: ₹{Number(p.minOrderAmount)}
                  </span>
                )}
                {p.productId && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#a855f7",
                      background: "rgba(168,85,247,0.1)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    Product-Specific (Min Qty: {p.minQuantity || 1})
                  </span>
                )}
              </div>

              {/* Usage bar */}
              {p.maxUses && (
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "var(--color-text-faint)",
                      marginBottom: "4px",
                    }}
                  >
                    <span>Used</span>
                    <span>
                      {p.usedCount} / {p.maxUses}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "4px",
                      borderRadius: "999px",
                      background: "var(--color-bg-overlay)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${usagePct}%`,
                        background:
                          usagePct >= 90 ? "#ef4444" : "var(--color-primary)",
                        borderRadius: "999px",
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: "11px", color: "var(--color-text-faint)" }}
                >
                  {isExpired
                    ? "⚠ Expired"
                    : p.validUntil
                      ? `Expires ${format(new Date(p.validUntil), "dd MMM yyyy")}`
                      : "No expiry"}
                </span>
                <button
                  id={`toggle-promo-${p.id}`}
                  onClick={() => toggleActive(p)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: p.isActive
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(239,68,68,0.1)",
                    color: p.isActive ? "#4ade80" : "#f87171",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {p.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {promos.length === 0 && !loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--color-text-faint)",
          }}
        >
          <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🏷️</p>
          <p style={{ margin: 0, fontSize: "16px" }}>No promotions yet</p>
          <p style={{ margin: "6px 0 0", fontSize: "13px" }}>
            Create your first coupon above
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "480px",
              width: "100%",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <h3
              style={{
                margin: "0 0 24px",
                fontSize: "18px",
                fontWeight: "700",
              }}
            >
              {editPromo ? "Edit Promotion" : "New Promotion"}
            </h3>
            <form
              onSubmit={save}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label>Coupon Code</label>
                  <input
                    id="promo-code"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. SUMMER20 (optional)"
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  />
                </div>
                <div>
                  <label>Type *</label>
                  <select
                    id="promo-type"
                    value={form.discountType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        discountType: e.target.value as any,
                      }))
                    }
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>
              <div>
                <label>Display Name *</label>
                <input
                  id="promo-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Summer Special 20% Off"
                  required
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label>
                    Discount Value *{" "}
                    {form.discountType === "PERCENTAGE" ? "(%)" : "(₹)"}
                  </label>
                  <input
                    id="promo-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discountValue: e.target.value }))
                    }
                    placeholder={
                      form.discountType === "PERCENTAGE" ? "20" : "50"
                    }
                    required
                  />
                </div>
                <div>
                  <label>Min. Order Amount (₹)</label>
                  <input
                    id="promo-min"
                    type="number"
                    min="0"
                    value={form.minOrderAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minOrderAmount: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label>Target Product</label>
                  <select
                    value={form.productId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, productId: e.target.value }))
                    }
                  >
                    <option value="">Order Level (No Product)</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Min. Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={form.minQuantity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minQuantity: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label>Max Uses</label>
                  <input
                    id="promo-maxuses"
                    type="number"
                    min="1"
                    value={form.maxUses}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxUses: e.target.value }))
                    }
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label>Valid Until</label>
                  <input
                    id="promo-expires"
                    type="date"
                    min={
                      new Date(
                        new Date().getTime() -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .split("T")[0]
                    }
                    value={form.validUntil}
                    onChange={(e) => {
                      const value = e.target.value;
                      const todayStr = new Date(
                        new Date().getTime() -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .split("T")[0];
                      console.log(
                        new Date(
                          new Date().getTime() -
                            new Date().getTimezoneOffset() * 60000,
                        ).toISOString(),
                      );
                      if (value && value < todayStr) {
                        toast.error("Expiration date cannot be in the past");
                        return;
                      }
                      setForm((f) => ({ ...f, validUntil: value }));
                    }}
                  />
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  id="promo-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "var(--color-primary)",
                  }}
                />
                <label style={{ margin: 0 }}>
                  Active (visible to customers)
                </label>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    padding: "11px",
                    justifyContent: "center",
                  }}
                >
                  Cancel
                </button>
                <button
                  id="promo-save-btn"
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    background:
                      "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                    color: "#fff",
                    padding: "11px",
                    justifyContent: "center",
                    fontWeight: "600",
                  }}
                >
                  {saving
                    ? "Saving..."
                    : editPromo
                      ? "Save Changes"
                      : "Create Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
