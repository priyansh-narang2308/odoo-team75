/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  ChefHat,
  CreditCard,
  X,
  User,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import Image from "next/image";
import { CustomerPaymentSheet } from "@/components/customer/customer-payment-sheet";
import { ReceiptPrinter } from "@/components/shared/receipt-printer";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  taxRate: number;
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
  notes?: string;
}

interface OrderStatus {
  orderId: string;
  orderNumber: number;
  status: string;
  items: { productName: string; quantity: number; kdsStatus: string }[];
  grandTotal: number;
}

interface CustomerSession {
  id: string;
  name: string;
  email: string;
  tableId: string;
}

interface Props {
  tableId: string;
  tableNumber: string;
  floorName: string;
  customer: CustomerSession;
  onLogout?: () => void;
}

const KDS_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  TO_COOK: { label: "To Cook", color: "#9ca3af" },
  PREPARING: { label: "Preparing", color: "#60a5fa" },
  COMPLETED: { label: "Completed", color: "#4ade80" },
};

export function CustomerMenu({
  tableId,
  tableNumber,
  floorName,
  customer,
  onLogout,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderStatus | null>(null);
  const [view, setView] = useState<"menu" | "status" | "profile">("menu");
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { socket } = useSocket();
  const [loggingOut, setLoggingOut] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/customer/me", { method: "DELETE" });
      if (onLogout) {
        onLogout();
      } else {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([p, c]) => {
      setProducts(p.data || []);
      setCategories(c.data || []);
    });

    // Check for existing order
    fetch(`/api/orders?tableId=${tableId}&status=SENT`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data?.length > 0) {
          const o = d.data[0];
          setActiveOrder({
            orderId: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            grandTotal: Number(o.grandTotal),
            items: o.items.map((i: any) => ({
              productName: i.product.name,
              quantity: i.quantity,
              kdsStatus: i.kdsStatus,
            })),
          });
          setView("status");
        }
      });
  }, [tableId]);

  // Socket for live order updates
  useEffect(() => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.JOIN_TABLE, tableId);

    socket.on(SOCKET_EVENTS.ORDER_STATUS, (payload: any) => {
      if (activeOrder && payload.orderId === activeOrder.orderId) {
        setActiveOrder((prev) =>
          prev ? { ...prev, status: payload.status } : null,
        );
      }
    });

    socket.on(SOCKET_EVENTS.KDS_ITEM_UPDATED, (payload: any) => {
      setActiveOrder((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.productName === payload.productName
              ? { ...i, kdsStatus: payload.kdsStatus }
              : i,
          ),
        };
      });
    });

    socket.on(SOCKET_EVENTS.PAYMENT_RECEIVED, (payload: any) => {
      if (activeOrder && payload.orderId === activeOrder.orderId) {
        setActiveOrder((prev) => (prev ? { ...prev, status: "PAID" } : null));
      }
    });

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS);
      socket.off(SOCKET_EVENTS.KDS_ITEM_UPDATED);
      socket.off(SOCKET_EVENTS.PAYMENT_RECEIVED);
    };
  }, [socket, tableId, activeOrder]);

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

  const placeOrder = async () => {
    // Now just opens the payment sheet
    setShowCart(false);
    setShowPayment(true);
  };

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

  const filteredProducts = products.filter(
    (p) => !selectedCat || p.category.id === selectedCat,
  );

  const styleVars = {
    bg: "var(--color-bg)",
    card: "var(--color-bg-elevated)",
    border: "var(--color-border)",
    primary: "var(--color-primary)",
    text: "var(--color-text)",
    muted: "var(--color-text-muted)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: styleVars.bg,
        color: styleVars.text,
        fontFamily: "inherit",
      }}
    >
      {/* Mobile Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(15,15,19,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${styleVars.border}`,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Image
            src="/CafePOS.png"
            alt="CafePOS Logo"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: styleVars.text,
              }}
            >
              Café Odoo
            </div>
            <div style={{ fontSize: "12px", color: styleVars.muted }}>
              {floorName} · Table {tableNumber}
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <ThemeToggle />
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
              border: `1px solid ${styleVars.border}`,
              color: styleVars.muted,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
          >
            <LogOut size={13} />
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
                view === "profile"
                  ? "rgba(var(--color-primary-rgb),0.2)"
                  : "transparent",
              border: `1px solid ${view === "profile" ? "var(--color-primary)" : styleVars.border}`,
              color:
                view === "profile" ? "var(--color-primary)" : styleVars.muted,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <User size={13} /> {customer.name.split(" ")[0]}
          </button>
          {activeOrder && (
            <button
              id="view-status-btn"
              onClick={() => setView("status")}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                background:
                  view === "status"
                    ? "rgba(var(--color-primary-rgb),0.2)"
                    : "transparent",
                border: `1px solid ${view === "status" ? "var(--color-primary)" : styleVars.border}`,
                color:
                  view === "status" ? "var(--color-primary)" : styleVars.muted,
              }}
            >
              <ChefHat size={13} /> Order
            </button>
          )}
          <button
            id="view-menu-btn"
            onClick={() => setView("menu")}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              background:
                view === "menu"
                  ? "rgba(var(--color-primary-rgb),0.2)"
                  : "transparent",
              border: `1px solid ${view === "menu" ? "var(--color-primary)" : styleVars.border}`,
              color: view === "menu" ? "var(--color-primary)" : styleVars.muted,
            }}
          >
            Menu
          </button>
          {cartCount > 0 && view === "menu" && (
            <button
              id="show-cart-btn"
              onClick={() => setShowCart(true)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                background: styleVars.primary,
                color: "#fff",
                border: "none",
              }}
            >
              <ShoppingCart size={13} /> {cartCount}
            </button>
          )}
        </div>
      </div>

      {/* ===== ORDER STATUS VIEW ===== */}
      {view === "status" && activeOrder && (
        <div
          style={{ padding: "20px 16px", maxWidth: "500px", margin: "0 auto" }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>
              {activeOrder.status === "PAID"
                ? "✅"
                : activeOrder.status === "SENT"
                  ? "👨‍🍳"
                  : "⏳"}
            </div>
            <h2
              style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800" }}
            >
              Order #{activeOrder.orderNumber}
            </h2>
            <div
              style={{
                display: "inline-flex",
                padding: "4px 14px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "700",
                background:
                  activeOrder.status === "PAID"
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(245,158,11,0.15)",
                color: activeOrder.status === "PAID" ? "#4ade80" : "#fbbf24",
              }}
            >
              {activeOrder.status === "PAID" ? "Paid ✓" : "In Kitchen"}
            </div>
          </div>

          {/* Item status list */}
          <div
            style={{
              background: styleVars.card,
              border: `1px solid ${styleVars.border}`,
              borderRadius: "14px",
              overflow: "hidden",
              marginBottom: "20px",
            }}
          >
            {activeOrder.items.map((item, idx) => {
              const s = KDS_STATUS_LABEL[item.kdsStatus] || {
                label: item.kdsStatus,
                color: "#9ca3af",
              };
              return (
                <div
                  key={idx}
                  style={{
                    padding: "12px 16px",
                    borderBottom:
                      idx < activeOrder.items.length - 1
                        ? `1px solid ${styleVars.border}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>
                    ×{item.quantity} {item.productName}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: s.color,
                      background: `${s.color}20`,
                      padding: "3px 10px",
                      borderRadius: "999px",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              background: styleVars.card,
              border: `1px solid ${styleVars.border}`,
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "700",
                fontSize: "16px",
              }}
            >
              <span>Total</span>
              <span style={{ color: styleVars.primary }}>
                {formatCurrency(activeOrder.grandTotal)}
              </span>
            </div>
            {activeOrder.status !== "PAID" && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "12px",
                  color: styleVars.muted,
                }}
              >
                Payment will be processed by your server or at the counter.
              </p>
            )}
          </div>

          <button
            id="add-more-btn"
            onClick={() => setView("menu")}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "12px",
              background: "transparent",
              border: `1px solid ${styleVars.border}`,
              color: styleVars.muted,
              fontWeight: "600",
              justifyContent: "center",
            }}
          >
            Browse Menu
          </button>
        </div>
      )}

      {/* ===== PROFILE VIEW ===== */}
      {view === "profile" && (
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
              background: styleVars.card,
              border: `1px solid ${styleVars.border}`,
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
                background: `${styleVars.primary}22`,
                color: styleVars.primary,
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
            <p style={{ margin: 0, fontSize: "14px", color: styleVars.muted }}>
              {customer.email}
            </p>
            <button
              id="profile-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                marginTop: "16px",
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
              style={{
                textAlign: "center",
                padding: "40px",
                color: styleVars.muted,
              }}
            >
              Loading history...
            </div>
          ) : orderHistory.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: styleVars.muted,
                background: styleVars.card,
                borderRadius: "14px",
                border: `1px solid ${styleVars.border}`,
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
                      background: styleVars.card,
                      border: `1px solid ${styleVars.border}`,
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
                            color: styleVars.primary,
                          }}
                        >
                          Order #{order.orderNumber}
                        </div>
                        <div
                          style={{ fontSize: "12px", color: styleVars.muted }}
                        >
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
                          color: styleVars.text,
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
                        color: styleVars.muted,
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

      {/* ===== MENU VIEW ===== */}
      {view === "menu" && (
        <div style={{ paddingBottom: "120px" }}>
          {/* Category tabs */}
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              borderBottom: `1px solid ${styleVars.border}`,
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
                background: !selectedCat ? styleVars.primary : "transparent",
                color: !selectedCat ? "#fff" : styleVars.muted,
                border: `1px solid ${!selectedCat ? styleVars.primary : styleVars.border}`,
                flexShrink: 0,
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
                  color: selectedCat === cat.id ? cat.color : styleVars.muted,
                  border: `1px solid ${selectedCat === cat.id ? cat.color + "44" : styleVars.border}`,
                  flexShrink: 0,
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
            }}
          >
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.productId === product.id);
              return (
                <div
                  key={product.id}
                  style={{
                    background: styleVars.card,
                    border: `1px solid ${product.category.color ? product.category.color + "33" : styleVars.border}`,
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
                        color: styleVars.muted,
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
                      <div style={{ fontSize: "12px", color: styleVars.muted }}>
                        {product.description}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "800",
                        color: product.category.color || styleVars.primary,
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
                          id={`dec-${product.id}`}
                          onClick={() =>
                            updateQty(product.id, inCart.quantity - 1)
                          }
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            background: styleVars.border,
                            color: styleVars.text,
                            padding: 0,
                            justifyContent: "center",
                            border: "none",
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
                          id={`inc-${product.id}`}
                          onClick={() => addToCart(product)}
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            background:
                              product.category.color || styleVars.primary,
                            color: "#fff",
                            padding: 0,
                            justifyContent: "center",
                            border: "none",
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`add-${product.id}`}
                        onClick={() => addToCart(product)}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: `${product.category.color || styleVars.primary}22`,
                          color: product.category.color || styleVars.primary,
                          border: `1px solid ${product.category.color ? product.category.color + "44" : styleVars.primary + "44"}`,
                          padding: 0,
                          justifyContent: "center",
                        }}
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cart bottom bar */}
      {cartCount > 0 && view === "menu" && !showCart && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px",
            background: "rgba(15,15,19,0.98)",
            backdropFilter: "blur(12px)",
            borderTop: `1px solid ${styleVars.border}`,
          }}
        >
          <button
            id="view-cart-bottom"
            onClick={() => setShowCart(true)}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: "12px",
              background: `linear-gradient(135deg, ${styleVars.primary}, var(--color-primary-dark))`,
              color: "#fff",
              fontWeight: "700",
              fontSize: "16px",
              justifyContent: "space-between",
              boxShadow: "0 8px 24px rgba(var(--color-primary-rgb),0.3)",
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
              background: styleVars.card,
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
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>
                Your Cart
              </h3>
              <button
                onClick={() => setShowCart(false)}
                style={{
                  background: styleVars.border,
                  color: styleVars.muted,
                  padding: "8px",
                  borderRadius: "8px",
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
                  borderBottom: `1px solid ${styleVars.border}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "13px", color: styleVars.primary }}>
                    {formatCurrency(item.price)} ea.
                  </div>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <button
                    id={`cart-dec-${item.productId}`}
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: styleVars.border,
                      color: styleVars.text,
                      padding: 0,
                      justifyContent: "center",
                      border: "none",
                    }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: "700" }}>{item.quantity}</span>
                  <button
                    id={`cart-inc-${item.productId}`}
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: styleVars.primary,
                      color: "#fff",
                      padding: 0,
                      justifyContent: "center",
                      border: "none",
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
                  color: styleVars.muted,
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
                  color: styleVars.muted,
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
                <span style={{ color: styleVars.primary }}>
                  {formatCurrency(cartTotal + cartTax)}
                </span>
              </div>
              <button
                id="place-order-btn"
                onClick={placeOrder}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  background: submitting
                    ? "#5a3a20"
                    : `linear-gradient(135deg, ${styleVars.primary}, var(--color-primary-dark))`,
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "16px",
                  justifyContent: "center",
                  boxShadow: "0 8px 24px rgba(var(--color-primary-rgb),0.3)",
                }}
              >
                <Send size={16} />
                {submitting ? "Sending order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* ── Payment Sheet ── */}
      {showPayment && (
        <CustomerPaymentSheet
          tableId={tableId}
          cart={cart}
          grandTotal={cartTotal + cartTax}
          subtotal={cartTotal}
          taxTotal={cartTax}
          customerName={customer.name}
          onSuccess={async (orderId, orderNumber, paymentMethod) => {
            setShowPayment(false);
            // Fetch full order for tracking
            const res = await fetch(`/api/orders/${orderId}`);
            const data = await res.json();
            if (data.ok) {
              const order = data.data;
              setReceipt({
                orderNumber: order.orderNumber,
                tableNumber: order.table?.tableNumber || tableNumber,
                floorName: order.table?.floor?.name || floorName,
                customerName: order.customer?.name || customer.name,
                items: order.items.map((i: any) => ({
                  name: i.product.name,
                  quantity: i.quantity,
                  unitPrice: Number(i.product.price),
                  lineTotal: Number(i.quantity * i.product.price),
                })),
                subtotal: Number(order.subtotal),
                taxTotal: Number(order.taxTotal),
                discountTotal: Number(order.discountTotal || 0),
                grandTotal: Number(order.grandTotal),
                paymentMethod: paymentMethod,
                paidAt: new Date(order.createdAt),
              });

              setActiveOrder({
                orderId,
                orderNumber,
                status: "SENT",
                grandTotal: Number(order.grandTotal),
                items: order.items.map((i: any) => ({
                  productName: i.product.name,
                  quantity: i.quantity,
                  kdsStatus: i.kdsStatus,
                })),
              });
            }
            setCart([]);
            setView("status");
          }}
          onBack={() => {
            setShowPayment(false);
            setShowCart(true);
          }}
        />
      )}

      {/* ── Receipt Printer ── */}
      {receipt && (
        <ReceiptPrinter
          orderNumber={receipt.orderNumber}
          tableNumber={receipt.tableNumber}
          floorName={receipt.floorName}
          customerName={receipt.customerName}
          items={receipt.items}
          subtotal={receipt.subtotal}
          taxTotal={receipt.taxTotal}
          discountTotal={receipt.discountTotal}
          grandTotal={receipt.grandTotal}
          paymentMethod={receipt.paymentMethod}
          paidAt={receipt.paidAt}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
