/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Plus, Minus, X, LogOut, User } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  taxRate: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: { id: string; name: string; color: string };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  taxRate: number;
  quantity: number;
}

interface CustomerSession {
  id: string;
  name: string;
  email: string;
  tableId: string | null;
}

export default function CustomerMenuPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [view, setView] = useState<"menu" | "profile">("menu");
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadProfile = () => {
    setView("profile");
    setHistoryLoading(true);
    fetch("/api/orders?history=true&limit=20")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setOrderHistory(d.data || []);
      })
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/customer/me").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([meRes, prodRes, catRes]) => {
      if (!meRes.ok) {
        router.push("/customer/login");
        return;
      }
      setCustomer(meRes.data);
      setProducts((prodRes.data || []).filter((p: Product) => p.isAvailable));
      setCategories(catRes.data || []);
      setLoading(false);
    });
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/customer/me", { method: "DELETE" });
    router.push("/customer/login");
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === product.id);
      if (ex)
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          taxRate: Number(product.taxRate),
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0)
      setCart((prev) => prev.filter((i) => i.productId !== productId));
    else
      setCart((prev) =>
        prev.map((i) =>
          i.productId === productId ? { ...i, quantity: qty } : i,
        ),
      );
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartTax = cart.reduce(
    (sum, i) => sum + i.price * i.quantity * (i.taxRate / 100),
    0,
  );
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const filteredProducts = products.filter(
    (p) => !selectedCat || p.category.id === selectedCat,
  );

  const s = {
    bg: "#0f0f13",
    card: "#1a1a24",
    border: "#2a2a3a",
    primary: "#c87941",
    text: "#f0eee8",
    muted: "#8a8a9a",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: s.bg,
          color: s.muted,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>☕</div>
          <p>Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: s.bg,
        color: s.text,
        fontFamily: "inherit",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(15,15,19,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${s.border}`,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: s.text }}>
            ☕ Café Odoo
          </div>
          <div style={{ fontSize: "12px", color: s.muted }}>
            Welcome, {customer?.name}
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            id="customer-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              background: "transparent",
              border: `1px solid ${s.border}`,
              color: s.muted,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <LogOut size={13} /> {loggingOut ? "..." : "Logout"}
          </button>

          <button
            id="view-profile-btn"
            onClick={loadProfile}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              background:
                view === "profile" ? "rgba(200,121,65,0.2)" : "transparent",
              border: `1px solid ${view === "profile" ? "#c87941" : s.border}`,
              color: view === "profile" ? "#c87941" : s.muted,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
          >
            <User size={13} /> Profile
          </button>

          {view === "profile" && (
            <button
              id="view-menu-btn"
              onClick={() => setView("menu")}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                background: "transparent",
                border: `1px solid ${s.border}`,
                color: s.muted,
                cursor: "pointer",
              }}
            >
              Menu
            </button>
          )}

          {cartCount > 0 && view === "menu" && (
            <button
              id="show-cart-btn"
              onClick={() => setShowCart(true)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                background: s.primary,
                color: "#fff",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
              }}
            >
              <ShoppingCart size={13} /> {cartCount}
            </button>
          )}
        </div>
      </div>

      {view === "menu" && (
        <>
          {/* Category tabs */}
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              borderBottom: `1px solid ${s.border}`,
            }}
          >
            <button
              id="menu-cat-all"
              onClick={() => setSelectedCat(null)}
              style={{
                padding: "7px 16px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "600",
                background: !selectedCat ? s.primary : "transparent",
                color: !selectedCat ? "#fff" : s.muted,
                border: `1px solid ${!selectedCat ? s.primary : s.border}`,
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`menu-cat-${cat.id}`}
                onClick={() =>
                  setSelectedCat(cat.id === selectedCat ? null : cat.id)
                }
                style={{
                  padding: "7px 16px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: "600",
                  background:
                    selectedCat === cat.id ? `${cat.color}22` : "transparent",
                  color: selectedCat === cat.id ? cat.color : s.muted,
                  border: `1px solid ${selectedCat === cat.id ? cat.color + "44" : s.border}`,
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products */}
          <div
            style={{
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              paddingBottom: "120px",
            }}
          >
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.productId === product.id);
              return (
                <div
                  key={product.id}
                  style={{
                    background: s.card,
                    border: `1px solid ${s.border}`,
                    borderRadius: "14px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: product.category.color,
                        fontWeight: "700",
                        marginBottom: "2px",
                      }}
                    >
                      {product.category.name}
                    </div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        marginBottom: "2px",
                      }}
                    >
                      {product.name}
                    </div>
                    {product.description && (
                      <div style={{ fontSize: "12px", color: s.muted }}>
                        {product.description}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "800",
                        color: s.primary,
                        marginTop: "6px",
                      }}
                    >
                      {formatCurrency(Number(product.price))}
                    </div>
                  </div>
                  <div style={{ marginLeft: "12px", flexShrink: 0 }}>
                    {inCart ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() =>
                            updateQty(product.id, inCart.quantity - 1)
                          }
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            background: s.border,
                            color: s.text,
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <span
                          style={{
                            fontWeight: "700",
                            fontSize: "16px",
                            minWidth: "20px",
                            textAlign: "center",
                          }}
                        >
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(product)}
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            background: s.primary,
                            color: "#fff",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: `${s.primary}22`,
                          color: s.primary,
                          border: `1px solid ${s.primary}44`,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: s.muted,
                }}
              >
                No products found
              </div>
            )}
          </div>

          {/* Cart bottom bar */}
          {cartCount > 0 && !showCart && (
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "16px",
                background: "rgba(15,15,19,0.98)",
                backdropFilter: "blur(12px)",
                borderTop: `1px solid ${s.border}`,
              }}
            >
              <button
                id="view-cart-bottom"
                onClick={() => setShowCart(true)}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${s.primary}, #a06030)`,
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 8px 24px rgba(200,121,65,0.3)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    padding: "2px 10px",
                    borderRadius: "999px",
                  }}
                >
                  {cartCount}
                </span>
                <span>View Cart</span>
                <span>{formatCurrency(cartTotal + cartTax)}</span>
              </button>
            </div>
          )}

          {/* Cart sheet */}
          {showCart && (
            <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.7)",
                }}
                onClick={() => setShowCart(false)}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: s.card,
                  borderRadius: "20px 20px 0 0",
                  padding: "20px",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  animation: "slideUp 0.3s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h3
                    style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}
                  >
                    Your Cart
                  </h3>
                  <button
                    onClick={() => setShowCart(false)}
                    style={{
                      background: s.border,
                      color: s.muted,
                      padding: "8px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {cart.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 0",
                      borderBottom: `1px solid ${s.border}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "13px", color: s.primary }}>
                        {formatCurrency(item.price)} ea.
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <button
                        onClick={() =>
                          updateQty(item.productId, item.quantity - 1)
                        }
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "7px",
                          background: s.border,
                          color: s.text,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: "700" }}>{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQty(item.productId, item.quantity + 1)
                        }
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "7px",
                          background: s.primary,
                          color: "#fff",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ padding: "16px 0 0" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      color: s.muted,
                      marginBottom: "4px",
                    }}
                  >
                    <span>Subtotal</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      color: s.muted,
                      marginBottom: "12px",
                    }}
                  >
                    <span>Tax</span>
                    <span>{formatCurrency(cartTax)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "18px",
                      fontWeight: "800",
                      marginBottom: "20px",
                    }}
                  >
                    <span>Total</span>
                    <span style={{ color: s.primary }}>
                      {formatCurrency(cartTotal + cartTax)}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      color: s.muted,
                      textAlign: "center",
                      marginBottom: "16px",
                    }}
                  >
                    This is a browse-only view. To place an order, please scan
                    the QR code on your table.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== PROFILE VIEW ===== */}
      {view === "profile" && customer && (
        <div
          style={{
            padding: "20px 16px",
            maxWidth: "500px",
            margin: "0 auto",
            paddingBottom: "120px",
          }}
        >
          <div
            style={{
              background: s.card,
              border: `1px solid ${s.border}`,
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: `${s.primary}22`,
                color: s.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "700",
                margin: "0 auto 12px",
              }}
            >
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <h2
              style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800" }}
            >
              {customer.name}
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: "14px", color: s.muted }}>
              {customer.email}
            </p>
            <button
              id="profile-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#f87171",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <LogOut size={14} /> {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>

          <h3
            style={{
              fontSize: "16px",
              fontWeight: "700",
              marginBottom: "16px",
            }}
          >
            Order History
          </h3>

          {historyLoading ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: s.muted }}
            >
              Loading history...
            </div>
          ) : orderHistory.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: s.muted,
                background: s.card,
                borderRadius: "14px",
                border: `1px solid ${s.border}`,
              }}
            >
              <p>No past orders found.</p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {orderHistory.map((order) => {
                const isCancelled = order.status === "CANCELLED";
                return (
                  <div
                    key={order.id}
                    style={{
                      background: s.card,
                      border: `1px solid ${s.border}`,
                      borderRadius: "14px",
                      padding: "16px",
                      opacity: isCancelled ? 0.7 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: s.primary,
                          }}
                        >
                          Order #{order.orderNumber}
                        </div>
                        <div style={{ fontSize: "12px", color: s.muted }}>
                          {new Date(order.createdAt).toLocaleDateString()} at{" "}
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "15px", fontWeight: "700" }}>
                          {formatCurrency(Number(order.grandTotal))}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            display: "inline-block",
                            marginTop: "4px",
                            background:
                              order.status === "PAID"
                                ? "rgba(34,197,94,0.15)"
                                : order.status === "CANCELLED"
                                  ? "rgba(239,68,68,0.15)"
                                  : "rgba(245,158,11,0.15)",
                            color:
                              order.status === "PAID"
                                ? "#4ade80"
                                : order.status === "CANCELLED"
                                  ? "#f87171"
                                  : "#fbbf24",
                          }}
                        >
                          {order.status}
                        </div>
                      </div>
                    </div>

                    {order.table && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: s.text,
                          marginBottom: "8px",
                          background: "rgba(255,255,255,0.05)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          display: "inline-block",
                        }}
                      >
                        📍 {order.table.floor.name} - Table{" "}
                        {order.table.tableNumber}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: "13px",
                        color: s.muted,
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {order.items.map((item: any) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>
                            {item.quantity}x {item.product.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
