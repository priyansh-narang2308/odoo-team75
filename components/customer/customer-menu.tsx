/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingCart,
  Plus,
  Minus,
  Send,
  ChefHat,
  X,
  User,
  LogOut,
} from "lucide-react";
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
  subtotal: number;
  taxTotal: number;
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

const AVAILABLE_IMAGES = [
  "Affogato shake.jpg",
  "Affogato.jpg",
  "Americano.jpg",
  "Avocado Toast.jpg",
  "Caesar Salad.jpg",
  "Cappucino.jpg",
  "Chai.jpg",
  "Chamomile.jpg",
  "Chocolate Brownie.jpg",
  "Cold brew.jpg",
  "Cortado.jpg",
  "Darjeeling.jpg",
  "Earl grey.jpg",
  "Espresso.jpg",
  "Flat white.jpg",
  "French Fries.jpg",
  "Garden Salad.jpg",
  "Garlic Bread.jpg",
  "Greek Salad.jpg",
  "Green tea.jpg",
  "Hibiscus.jpg",
  "Iced latte.jpg",
  "Jasmine.jpg",
  "Latte.jpg",
  "Mac and Cheese.jpg",
  "Machiato.jpg",
  "Matcha.jpg",
  "Mocha.jpg",
  "Onion Rings.jpg",
  "Oolong.jpg",
  "Pancake Stack.jpg",
  "Penne Alfredo.jpg",
  "Peppermint.jpg",
  "Red Velve.jpg",
  "Ristretto.jpg",
  "Spaghetti Bolognese.jpg",
  "cheese burger.jpg",
  "chicken burger.jpg",
  "frappe.jpg",
  "iced americano.jpg",
  "iced mocha.jpg",
  "margherita.jpg",
  "nitro brew.jpg",
  "pepperoni.jpg",
  "tonic espresso.jpg",
  "veg burger.jpg",
  "veggie delight.jpg",
  "Almond Milk.png",
  "Cheesecake.png",
  "Chicken Sandwich.png",
  "Croissant.png",
  "Fresh Lime Soda.png",
  "Oat Milk.png",
  "Paneer Tikka.png",
  "Tiramisu.png",
  "Veg Sandwich.png",
  "Whipped Cream.png",
];

function getProductImage(productName: string) {
  const normalized = productName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normalized.includes("redvelvet")) return "/Red Velve.jpg";
  if (normalized.includes("cappuccino")) return "/Cappucino.jpg";
  if (normalized.includes("macchiato")) return "/Machiato.jpg";
  if (normalized.includes("cheeseburger")) return "/cheese burger.jpg";
  if (normalized.includes("chickenburger")) return "/chicken burger.jpg";
  if (normalized.includes("vegburger")) return "/veg burger.jpg";
  if (normalized.includes("doubleespresso")) return "/Espresso.jpg";
  if (normalized.includes("extrashot")) return "/Espresso.jpg";
  if (normalized.includes("lattelarge")) return "/Latte.jpg";
  if (normalized.includes("lattesmall")) return "/Latte.jpg";
  if (normalized.includes("masalachai")) return "/Chai.jpg";

  for (const img of AVAILABLE_IMAGES) {
    const imgNormalized = img
      .split(".")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (imgNormalized === normalized) {
      return "/" + img;
    }
  }

  // Fallback: Pick a consistent random image based on the product name hash
  // This ensures every product in the menu has a beautiful image!
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVAILABLE_IMAGES.length;
  return "/" + AVAILABLE_IMAGES[index];
}

const playFlipSound = () => {
  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const bufferSize = ctx.sampleRate * 0.12; // 120ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // White noise with exponential decay to simulate paper brushing
      data[i] =
        (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000; // Muffled paper sound

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch {
    // Ignore if audio fails
  }
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
  const [view, setView] = useState<"menu" | "status" | "profile" | "product">(
    "menu",
  );
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // New States for Search and Product Detail
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailOptions, setDetailOptions] = useState<{
    variant?: string;
    extras: string[];
  }>({ extras: [] });

  // Book flip animation
  const [flipPhase, setFlipPhase] = useState<"idle" | "out" | "in">("idle");
  const [flipDir, setFlipDir] = useState<"forward" | "backward">("forward");
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const { socket } = useSocket();
  const [loggingOut, setLoggingOut] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);

  // Initialize selectedCat to first category when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCat) {
      setSelectedCat(categories[0].id);
    }
  }, [categories]);

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
            subtotal: Number(o.subtotal),
            taxTotal: Number(o.taxTotal),
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

  const addToCart = (product: Product, quantity = 1, notes?: string) => {
    setCart((prev) => {
      // For items with notes/variants, we might want to treat them as separate items, but for simplicity we'll group by ID and notes.
      const exIndex = prev.findIndex(
        (i) => i.productId === product.id && i.notes === notes,
      );
      if (exIndex >= 0) {
        const newCart = [...prev];
        newCart[exIndex].quantity += quantity;
        return newCart;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          taxRate: Number(product.taxRate),
          quantity: quantity,
          notes: notes,
        },
      ];
    });
  };

  const updateQty = (productId: string, qty: number, notes?: string) => {
    if (qty <= 0)
      setCart((prev) =>
        prev.filter((i) => !(i.productId === productId && i.notes === notes)),
      );
    else
      setCart((prev) =>
        prev.map((i) =>
          i.productId === productId && i.notes === notes
            ? { ...i, quantity: qty }
            : i,
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
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          source: "CUSTOMER",
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes,
          })),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const oRes = await fetch(`/api/orders?tableId=${tableId}&status=SENT`);
      const oData = await oRes.json();
      if (oData.ok && oData.data?.length > 0) {
        const o = oData.data[0];
        setActiveOrder({
          orderId: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          subtotal: Number(o.subtotal),
          taxTotal: Number(o.taxTotal),
          grandTotal: Number(o.grandTotal),
          items: o.items.map((i: any) => ({
            productName: i.product.name,
            quantity: i.quantity,
            kdsStatus: i.kdsStatus,
          })),
        });
      }

      setCart([]);
      setShowCart(false);
      setView("status");
    } catch (err: any) {
      alert("Failed to place order: " + err.message);
    } finally {
      setSubmitting(false);
    }
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

  const navigateCategory = (targetId: string, dir?: "forward" | "backward") => {
    if (flipPhase !== "idle") return;
    const curIdx = categories.findIndex((c) => c.id === selectedCat);
    const tgtIdx = categories.findIndex((c) => c.id === targetId);
    if (tgtIdx === curIdx || tgtIdx < 0) return;

    playFlipSound(); // Play the flipping noise!

    const direction = dir ?? (tgtIdx > curIdx ? "forward" : "backward");
    setFlipDir(direction);
    setFlipPhase("out");
    setTimeout(() => {
      setSelectedCat(targetId);
      setFlipPhase("in");
    }, 290);
    setTimeout(() => {
      setFlipPhase("idle");
    }, 820);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = !selectedCat || p.category.id === selectedCat;
    const matchesSearch =
      !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const styleVars = {
    bg: "#ffffff",
    card: "#ffffff",
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
          background: "var(--color-bg-overlay)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${styleVars.border}`,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: styleVars.text,
              }}
            >
              The Purple Cup Cafe
            </div>
            <div style={{ fontSize: "12px", color: styleVars.muted }}>
              {floorName} · Table {tableNumber}
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
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
            onClick={() => {
              setView("menu");
              setSelectedProduct(null);
            }}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              background:
                view === "menu" || view === "product"
                  ? "rgba(var(--color-primary-rgb),0.2)"
                  : "transparent",
              border: `1px solid ${view === "menu" || view === "product" ? "var(--color-primary)" : styleVars.border}`,
              color:
                view === "menu" || view === "product"
                  ? "var(--color-primary)"
                  : styleVars.muted,
            }}
          >
            Menu
          </button>
          {cartCount > 0 && (view === "menu" || view === "product") && (
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
            id="request-bill-btn"
            onClick={() => setShowPayment(true)}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "12px",
              background: styleVars.primary,
              color: "#fff",
              fontWeight: "600",
              border: "none",
              marginBottom: "12px",
            }}
          >
            Request Bill / Settle Up
          </button>

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
          {/* Search Bar */}
          <div style={{ padding: "12px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${styleVars.border}`,
                borderRadius: "12px",
                padding: "8px 14px",
              }}
            >
              <span style={{ marginRight: "8px", color: styleVars.muted }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search product"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: styleVars.text,
                  outline: "none",
                  width: "100%",
                  fontSize: "14px",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: styleVars.muted,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ── Book Menu Card ── */}
          <div
            style={{
              padding: "6px 14px 16px",
              maxWidth: "640px",
              margin: "0 auto",
            }}
          >
            {/* Bookmark category tabs */}
            <div
              id="menu-book-tabs"
              style={{
                display: "flex",
                gap: "10px",
                overflowX: "auto",
                scrollbarWidth: "none",
                marginBottom: "20px",
                padding: "4px 8px",
                position: "relative",
                zIndex: 2,
              }}
            >
              {categories.map((cat) => {
                const isActive = cat.id === selectedCat;
                return (
                  <button
                    key={cat.id}
                    onClick={() => navigateCategory(cat.id)}
                    disabled={flipPhase !== "idle"}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: "700",
                      flexShrink: 0,
                      background: isActive
                        ? cat.color || styleVars.primary
                        : "rgba(0,0,0,0.04)",
                      border: "1px solid",
                      borderColor: isActive
                        ? cat.color || styleVars.primary
                        : "rgba(0,0,0,0.02)",
                      color: isActive ? "#ffffff" : styleVars.muted,
                      cursor: flipPhase !== "idle" ? "not-allowed" : "pointer",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: isActive
                        ? `0 4px 12px ${cat.color || styleVars.primary}40`
                        : "none",
                      transform: isActive ? "translateY(-1px)" : "none",
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Book pages stack */}
            <div style={{ position: "relative" }}>
              {/* Depth shadows – stacked pages illusion */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "16px 16px 16px 4px",
                  background: "rgba(255,255,255,0.025)",
                  transform: "translate(6px, 5px)",
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "16px 16px 16px 4px",
                  background: "rgba(255,255,255,0.015)",
                  transform: "translate(3px, 2.5px)",
                  zIndex: 0,
                }}
              />

              {/* ── Main animated page ── */}
              <div
                id="menu-book-page"
                style={{
                  position: "relative",
                  zIndex: 1,
                  background:
                    "linear-gradient(160deg, #ffffff 0%, #fcfbfa 100%)",
                  borderRadius: "16px 16px 16px 4px",
                  border: "1px solid #e7e5e4",
                  borderLeft: "5px solid rgba(0, 0, 0, 0.08)",
                  boxShadow:
                    "-7px 0 0 rgba(0,0,0,0.1), 0 22px 55px rgba(0,0,0,0.15), inset 12px 0 28px rgba(0,0,0,0.05)",
                  padding: "28px 20px 32px",
                  minHeight: "55vh",
                  overflow: "hidden",
                  transformOrigin: "left center",
                  transformStyle: "preserve-3d",
                  animation:
                    flipPhase === "out"
                      ? `${flipDir === "forward" ? "pageFlipOut" : "pageFlipOutReverse"} 0.28s ease-in forwards`
                      : flipPhase === "in"
                        ? `${flipDir === "forward" ? "pageFlipIn" : "pageFlipInReverse"} 0.52s ease-out forwards`
                        : "none",
                }}
                onTouchStart={(e) => {
                  touchStartX.current = e.touches[0].clientX;
                  touchStartY.current = e.touches[0].clientY;
                }}
                onTouchEnd={(e) => {
                  const dx = touchStartX.current - e.changedTouches[0].clientX;
                  const dy = Math.abs(
                    touchStartY.current - e.changedTouches[0].clientY,
                  );
                  if (Math.abs(dx) > 55 && dy < 100) {
                    const curIdx = categories.findIndex(
                      (c) => c.id === selectedCat,
                    );
                    if (dx > 0 && curIdx < categories.length - 1) {
                      navigateCategory(categories[curIdx + 1].id, "forward");
                    } else if (dx < 0 && curIdx > 0) {
                      navigateCategory(categories[curIdx - 1].id, "backward");
                    }
                  }
                }}
              >
                {/* Spine gradient shadow */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "32px",
                    background:
                      "linear-gradient(to right, rgba(0,0,0,0.2), transparent)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                />

                {/* Page content */}
                {(() => {
                  const currentCat = categories.find(
                    (c) => c.id === selectedCat,
                  );
                  if (!currentCat) return null;
                  const catIdx = categories.findIndex(
                    (c) => c.id === selectedCat,
                  );
                  const catProducts = products.filter(
                    (p) =>
                      p.category.id === selectedCat &&
                      (!searchQuery ||
                        p.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())),
                  );

                  return (
                    <>
                      {/* Category heading */}
                      <div
                        style={{ textAlign: "center", marginBottom: "26px" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "14px",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: "1px",
                              background: `linear-gradient(to right, transparent, ${currentCat.color || styleVars.primary}55)`,
                            }}
                          />
                          <span
                            style={{
                              color: `${currentCat.color || styleVars.primary}99`,
                              fontSize: "14px",
                            }}
                          >
                            ✦
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: "1px",
                              background: `linear-gradient(to left, transparent, ${currentCat.color || styleVars.primary}55)`,
                            }}
                          />
                        </div>

                        <h2
                          style={{
                            fontFamily: "var(--font-caveat), 'Georgia', serif",
                            fontSize: "38px",
                            color: currentCat.color || styleVars.primary,
                            margin: 0,
                            letterSpacing: "2px",
                            fontWeight: "normal",
                            textShadow: `0 0 40px ${currentCat.color || styleVars.primary}33`,
                          }}
                        >
                          {currentCat.name}
                        </h2>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginTop: "10px",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: "1px",
                              background:
                                "linear-gradient(to right, transparent, #e7e5e4)",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#57534e",
                              letterSpacing: "4px",
                            }}
                          >
                            {catIdx + 1} / {categories.length}
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: "1px",
                              background:
                                "linear-gradient(to left, transparent, #e7e5e4)",
                            }}
                          />
                        </div>
                      </div>

                      {/* Items */}
                      {catProducts.length === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "60px 20px",
                            color: styleVars.muted,
                            fontStyle: "italic",
                          }}
                        >
                          No items available
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "22px",
                          }}
                        >
                          {catProducts.map((product) => {
                            const inCart = cart.find(
                              (i) => i.productId === product.id,
                            );
                            const imgSrc = getProductImage(product.name);
                            return (
                              <div
                                key={product.id}
                                className="menu-item-row"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setDetailQty(1);
                                  setDetailOptions({ extras: [] });
                                  setView("product");
                                }}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: "12px",
                                  cursor: "pointer",
                                  padding: "8px",
                                  borderRadius: "10px",
                                  transition: "background 0.2s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "rgba(0,0,0,0.03)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    "transparent")
                                }
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "baseline",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "16px",
                                        fontWeight: "700",
                                        color: "#1c1917",
                                      }}
                                    >
                                      {product.name}
                                    </span>
                                    <div
                                      style={{
                                        flex: 1,
                                        borderBottom:
                                          "2px dotted rgba(0,0,0,0.15)",
                                        margin: "0 10px",
                                        alignSelf: "center",
                                        position: "relative",
                                        top: "-3px",
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: "16px",
                                        fontWeight: "700",
                                        color:
                                          currentCat.color || styleVars.primary,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {formatCurrency(Number(product.price))}
                                    </span>
                                  </div>

                                  {product.description && (
                                    <p
                                      style={{
                                        margin: "4px 0 0",
                                        fontSize: "12px",
                                        color: "#57534e",
                                        lineHeight: 1.4,
                                        fontStyle: "italic",
                                      }}
                                    >
                                      {product.description}
                                    </p>
                                  )}

                                  <div style={{ marginTop: "10px" }}>
                                    {inCart ? (
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          background: "rgba(0,0,0,0.05)",
                                          padding: "3px 6px",
                                          borderRadius: "8px",
                                          border: "1px solid rgba(0,0,0,0.08)",
                                        }}
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateQty(
                                              product.id,
                                              inCart.quantity - 1,
                                            );
                                          }}
                                          style={{
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "6px",
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: "16px",
                                              fontWeight: "800",
                                              color: "#1c1917",
                                              lineHeight: 1,
                                              position: "relative",
                                              top: "-1px",
                                            }}
                                          >
                                            −
                                          </span>
                                        </button>
                                        <span
                                          style={{
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            minWidth: "14px",
                                            textAlign: "center",
                                            color: "#1c1917",
                                          }}
                                        >
                                          {inCart.quantity}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateQty(
                                              product.id,
                                              inCart.quantity + 1,
                                            );
                                          }}
                                          style={{
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "6px",
                                            background:
                                              currentCat.color ||
                                              styleVars.primary,
                                            border: "none",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: "16px",
                                              fontWeight: "800",
                                              color: "#fff",
                                              lineHeight: 1,
                                              position: "relative",
                                              top: "-1px",
                                            }}
                                          >
                                            +
                                          </span>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addToCart(product);
                                        }}
                                        style={{
                                          padding: "5px 12px",
                                          borderRadius: "8px",
                                          background: "transparent",
                                          border: `1px solid ${(currentCat.color || styleVars.primary) + "55"}`,
                                          color:
                                            currentCat.color ||
                                            styleVars.primary,
                                          fontSize: "12px",
                                          fontWeight: "600",
                                          cursor: "pointer",
                                        }}
                                      >
                                        + Add
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {imgSrc && (
                                  <div
                                    style={{
                                      width: "80px",
                                      height: "80px",
                                      borderRadius: "10px",
                                      overflow: "hidden",
                                      flexShrink: 0,
                                      border: `1px solid ${styleVars.border}`,
                                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                    }}
                                  >
                                    <img
                                      src={imgSrc}
                                      alt={product.name}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Bottom ornament */}
                      <div
                        style={{
                          marginTop: "28px",
                          textAlign: "center",
                          color: `${styleVars.muted}44`,
                          fontSize: "16px",
                          letterSpacing: "10px",
                        }}
                      >
                        ✦ ✦ ✦
                      </div>
                    </>
                  );
                })()}

                {/* Page-corner curl */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                    borderStyle: "solid",
                    borderWidth: "0 0 38px 38px",
                    borderColor: `transparent transparent ${styleVars.bg} transparent`,
                    opacity: 0.65,
                  }}
                />
              </div>
            </div>

            {/* Navigation bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "14px",
              }}
            >
              <button
                id="menu-prev-page"
                onClick={() => {
                  const idx = categories.findIndex((c) => c.id === selectedCat);
                  if (idx > 0)
                    navigateCategory(categories[idx - 1].id, "backward");
                }}
                disabled={
                  flipPhase !== "idle" ||
                  categories.findIndex((c) => c.id === selectedCat) <= 0
                }
                style={{
                  padding: "10px 18px",
                  borderRadius: "12px",
                  background: styleVars.card,
                  border: `1px solid ${styleVars.border}`,
                  color: styleVars.text,
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor:
                    categories.findIndex((c) => c.id === selectedCat) <= 0 ||
                    flipPhase !== "idle"
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    categories.findIndex((c) => c.id === selectedCat) <= 0 ||
                    flipPhase !== "idle"
                      ? 0.35
                      : 1,
                  transition: "opacity 0.2s",
                }}
              >
                ← Prev
              </button>

              {/* Page dot indicators */}
              <div
                style={{ display: "flex", gap: "6px", alignItems: "center" }}
              >
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      const curIdx = categories.findIndex(
                        (c) => c.id === selectedCat,
                      );
                      const tgtIdx = categories.findIndex(
                        (c) => c.id === cat.id,
                      );
                      if (tgtIdx !== curIdx)
                        navigateCategory(
                          cat.id,
                          tgtIdx > curIdx ? "forward" : "backward",
                        );
                    }}
                    style={{
                      width: cat.id === selectedCat ? "22px" : "7px",
                      height: "7px",
                      borderRadius: "4px",
                      background:
                        cat.id === selectedCat
                          ? cat.color || styleVars.primary
                          : styleVars.border,
                      transition: "all 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      cursor: "pointer",
                      boxShadow:
                        cat.id === selectedCat
                          ? `0 0 8px ${cat.color || styleVars.primary}66`
                          : "none",
                    }}
                  />
                ))}
              </div>

              <button
                id="menu-next-page"
                onClick={() => {
                  const idx = categories.findIndex((c) => c.id === selectedCat);
                  if (idx < categories.length - 1)
                    navigateCategory(categories[idx + 1].id, "forward");
                }}
                disabled={
                  flipPhase !== "idle" ||
                  categories.findIndex((c) => c.id === selectedCat) >=
                    categories.length - 1
                }
                style={{
                  padding: "10px 18px",
                  borderRadius: "12px",
                  background: styleVars.card,
                  border: `1px solid ${styleVars.border}`,
                  color: styleVars.text,
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor:
                    categories.findIndex((c) => c.id === selectedCat) >=
                      categories.length - 1 || flipPhase !== "idle"
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    categories.findIndex((c) => c.id === selectedCat) >=
                      categories.length - 1 || flipPhase !== "idle"
                      ? 0.35
                      : 1,
                  transition: "opacity 0.2s",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PRODUCT DETAIL VIEW ===== */}
      {view === "product" && selectedProduct && (
        <div
          style={{
            paddingBottom: "120px",
            background: styleVars.bg,
            minHeight: "100vh",
          }}
        >
          {/* Header with Back button */}
          <div
            style={{ padding: "16px", display: "flex", alignItems: "center" }}
          >
            <button
              onClick={() => setView("menu")}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: styleVars.text,
                padding: "8px 12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              <span style={{ fontSize: "16px" }}>←</span> Back
            </button>
          </div>

          {/* Large Image Area */}
          <div
            style={{
              width: "100%",
              height: "250px",
              background: `linear-gradient(135deg, ${selectedProduct.category.color || styleVars.primary}44, ${styleVars.bg})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "80px",
              overflow: "hidden",
            }}
          >
            {getProductImage(selectedProduct.name) && (
              <img
                src={getProductImage(selectedProduct.name)}
                alt={selectedProduct.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            )}
          </div>

          <div style={{ padding: "20px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <h1 style={{ fontSize: "24px", fontWeight: "800", margin: 0 }}>
                {selectedProduct.name}
              </h1>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: selectedProduct.category.color || styleVars.primary,
                }}
              >
                {formatCurrency(Number(selectedProduct.price))}
              </div>
            </div>
            {selectedProduct.description && (
              <p
                style={{
                  color: styleVars.muted,
                  fontSize: "14px",
                  margin: "0 0 20px 0",
                  lineHeight: 1.5,
                }}
              >
                {selectedProduct.description}
              </p>
            )}

            {/* Dummy Variants (Radio) */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "20px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "15px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="variant"
                    value="Regular"
                    checked={
                      detailOptions.variant === "Regular" ||
                      !detailOptions.variant
                    }
                    onChange={(e) =>
                      setDetailOptions({
                        ...detailOptions,
                        variant: e.target.value,
                      })
                    }
                    style={{ accentColor: styleVars.primary }}
                  />
                  Regular
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "15px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="variant"
                    value="Large"
                    checked={detailOptions.variant === "Large"}
                    onChange={(e) =>
                      setDetailOptions({
                        ...detailOptions,
                        variant: e.target.value,
                      })
                    }
                    style={{ accentColor: styleVars.primary }}
                  />
                  Large
                </label>
              </div>
            </div>

            {/* Dummy Add-ons (Checkboxes) */}
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  marginBottom: "12px",
                }}
              >
                Extras
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {["Extra Cheese", "Extra Sauce", "Spicy"].map((ext) => (
                  <label
                    key={ext}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "15px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={detailOptions.extras.includes(ext)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setDetailOptions({
                            ...detailOptions,
                            extras: [...detailOptions.extras, ext],
                          });
                        else
                          setDetailOptions({
                            ...detailOptions,
                            extras: detailOptions.extras.filter(
                              (x) => x !== ext,
                            ),
                          });
                      }}
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: styleVars.primary,
                      }}
                    />
                    {ext}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Add to Cart Bar */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(15,15,19,0.98)",
              borderTop: `1px solid ${styleVars.border}`,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              zIndex: 40,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span
                style={{
                  fontSize: "13px",
                  color: styleVars.muted,
                  fontWeight: "600",
                }}
              >
                QTY
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <button
                  onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: styleVars.border,
                    color: styleVars.text,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Minus size={14} />
                </button>
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "16px",
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {detailQty}
                </span>
                <button
                  onClick={() => setDetailQty(detailQty + 1)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: styleVars.border,
                    color: styleVars.text,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                let notesStr = detailOptions.variant || "Regular";
                if (detailOptions.extras.length > 0)
                  notesStr += ` + ${detailOptions.extras.join(", ")}`;
                addToCart(selectedProduct, detailQty, notesStr);
                setView("menu");
              }}
              style={{
                flex: 1,
                background: `linear-gradient(135deg, ${styleVars.primary}, var(--color-primary-dark))`,
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "14px",
                fontWeight: "700",
                fontSize: "15px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 8px 24px rgba(var(--color-primary-rgb),0.3)",
              }}
            >
              <span>Add to Cart</span>
              <span>
                {formatCurrency(Number(selectedProduct.price) * detailQty)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Cart bottom bar */}
      {cartCount > 0 &&
        (view === "menu" || view === "product") &&
        !showCart && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "16px",
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(12px)",
              borderTop: `1px solid ${styleVars.border}`,
              zIndex: 9999,
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
        <div style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
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
                key={`${item.productId}-${item.notes || ""}`}
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
                  {item.notes && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: styleVars.muted,
                        marginTop: "2px",
                      }}
                    >
                      {item.notes}
                    </div>
                  )}
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <button
                    id={`cart-dec-${item.productId}`}
                    onClick={() =>
                      updateQty(item.productId, item.quantity - 1, item.notes)
                    }
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: styleVars.border,
                      padding: 0,
                      justifyContent: "center",
                      border: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: "800",
                        color: styleVars.text,
                        lineHeight: 1,
                        position: "relative",
                        top: "-1px",
                      }}
                    >
                      −
                    </span>
                  </button>
                  <span style={{ fontWeight: "700" }}>{item.quantity}</span>
                  <button
                    id={`cart-inc-${item.productId}`}
                    onClick={() =>
                      updateQty(item.productId, item.quantity + 1, item.notes)
                    }
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: styleVars.primary,
                      padding: 0,
                      justifyContent: "center",
                      border: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: "800",
                        color: "#fff",
                        lineHeight: 1,
                        position: "relative",
                        top: "-1px",
                      }}
                    >
                      +
                    </span>
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
              <div
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "#d97706",
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  marginBottom: "16px",
                  textAlign: "center",
                }}
              >
                ⚠️ Items are sent directly to the kitchen and{" "}
                <strong>cannot be cancelled</strong> once placed.
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
          to   { transform: translateY(0); }
        }

        /* ── Page-flip spring animations ── */
        @keyframes pageFlipOut {
          0%   { transform: perspective(1400px) rotateY(0deg);   filter: brightness(1); }
          100% { transform: perspective(1400px) rotateY(-90deg); filter: brightness(0.08); }
        }
        @keyframes pageFlipOutReverse {
          0%   { transform: perspective(1400px) rotateY(0deg);  filter: brightness(1); }
          100% { transform: perspective(1400px) rotateY(90deg); filter: brightness(0.08); }
        }
        /* spring-in: overshoot → settle */
        @keyframes pageFlipIn {
          0%   { transform: perspective(1400px) rotateY(90deg);          filter: brightness(0.08); }
          58%  { transform: perspective(1400px) rotateY(-11deg) scale(1.008); filter: brightness(1.12); }
          76%  { transform: perspective(1400px) rotateY(5deg)  scale(1);  filter: brightness(1); }
          88%  { transform: perspective(1400px) rotateY(-2.5deg); }
          95%  { transform: perspective(1400px) rotateY(1deg); }
          100% { transform: perspective(1400px) rotateY(0deg);           filter: brightness(1); }
        }
        @keyframes pageFlipInReverse {
          0%   { transform: perspective(1400px) rotateY(-90deg);         filter: brightness(0.08); }
          58%  { transform: perspective(1400px) rotateY(11deg) scale(1.008);  filter: brightness(1.12); }
          76%  { transform: perspective(1400px) rotateY(-5deg) scale(1); filter: brightness(1); }
          88%  { transform: perspective(1400px) rotateY(2.5deg); }
          95%  { transform: perspective(1400px) rotateY(-1deg); }
          100% { transform: perspective(1400px) rotateY(0deg);           filter: brightness(1); }
        }

        #menu-book-tabs::-webkit-scrollbar { display: none; }
        .menu-item-row:active { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* ── Payment Sheet ── */}
      {showPayment && (
        <CustomerPaymentSheet
          tableId={tableId}
          cart={cart}
          existingOrderId={activeOrder?.orderId || null}
          existingOrderNumber={activeOrder?.orderNumber || null}
          grandTotal={
            activeOrder ? activeOrder.grandTotal : cartTotal + cartTax
          }
          subtotal={activeOrder ? activeOrder.subtotal : cartTotal}
          taxTotal={activeOrder ? activeOrder.taxTotal : cartTax}
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
                subtotal: Number(order.subtotal),
                taxTotal: Number(order.taxTotal),
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
