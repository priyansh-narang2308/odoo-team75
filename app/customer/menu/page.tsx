/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
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

const AVAILABLE_IMAGES = [
  "Affogato shake.jpg", "Affogato.jpg", "Americano.jpg", "Avocado Toast.jpg",
  "Caesar Salad.jpg", "Cappucino.jpg", "Chai.jpg", "Chamomile.jpg", "Chocolate Brownie.jpg",
  "Cold brew.jpg", "Cortado.jpg", "Darjeeling.jpg", "Earl grey.jpg", "Espresso.jpg",
  "Flat white.jpg", "French Fries.jpg", "Garden Salad.jpg", "Garlic Bread.jpg",
  "Greek Salad.jpg", "Green tea.jpg", "Hibiscus.jpg", "Iced latte.jpg", "Jasmine.jpg",
  "Latte.jpg", "Mac and Cheese.jpg", "Machiato.jpg", "Matcha.jpg", "Mocha.jpg",
  "Onion Rings.jpg", "Oolong.jpg", "Pancake Stack.jpg", "Penne Alfredo.jpg",
  "Peppermint.jpg", "Red Velve.jpg", "Ristretto.jpg", "Spaghetti Bolognese.jpg",
  "cheese burger.jpg", "chicken burger.jpg", "frappe.jpg", "iced americano.jpg",
  "iced mocha.jpg", "margherita.jpg", "nitro brew.jpg", "pepperoni.jpg",
  "tonic espresso.jpg", "veg burger.jpg", "veggie delight.jpg",
  "Almond Milk.png", "Cheesecake.png", "Chicken Sandwich.png", "Croissant.png",
  "Fresh Lime Soda.png", "Oat Milk.png", "Paneer Tikka.png", "Tiramisu.png",
  "Veg Sandwich.png", "Whipped Cream.png"
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
    const imgNormalized = img.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (imgNormalized === normalized) {
      return "/" + img;
    }
  }
  return "";
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

  const [isMobile, setIsMobile] = useState(true);

  // Book flip animation
  const [flipPhase, setFlipPhase] = useState<"idle" | "out" | "in">("idle");
  const [flipDir, setFlipDir] = useState<"forward" | "backward">("forward");
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1000);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize selectedCat to first category when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCat) {
      setSelectedCat(categories[0].id);
    }
  }, [categories]);

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
            ☕ The Purple Cup Cafe
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
        <div style={{ paddingBottom: "120px" }}>

          {/* ── Book Menu Card ── */}
          <div style={{ padding: "8px 14px 16px", maxWidth: "680px", margin: "0 auto" }}>

            {/* Bookmark category tabs */}
            <div
              id="menu-book-tabs"
              style={{
                display: "flex",
                gap: "4px",
                overflowX: "auto",
                scrollbarWidth: "none",
                marginBottom: "-1px",
                position: "relative",
                zIndex: 2,
              }}
            >
              {categories.map((cat) => {
                const isActive = cat.id === selectedCat;
                return (
                  <button
                    key={cat.id}
                    id={`menu-cat-${cat.id}`}
                    onClick={() => navigateCategory(cat.id)}
                    disabled={flipPhase !== "idle"}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px 8px 0 0",
                      fontSize: "12px",
                      fontWeight: "600",
                      flexShrink: 0,
                      background: isActive
                        ? "#ffffff"
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isActive ? cat.color + "55" : s.border}`,
                      borderBottom: isActive
                        ? "2px solid #ffffff"
                        : `1px solid ${s.border}`,
                      color: isActive ? cat.color : s.muted,
                      cursor: flipPhase !== "idle" ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      transform: isActive ? "translateY(2px)" : "none",
                      position: "relative",
                      zIndex: isActive ? 3 : 1,
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Book pages stack */}
            <div style={{ position: "relative" }}>
              {/* Depth shadows ─ stacked pages illusion */}
              <div style={{
                position: "absolute", inset: 0,
                borderRadius: "0 16px 16px 4px",
                background: "rgba(255,255,255,0.025)",
                transform: "translate(6px,5px)", zIndex: 0,
              }} />
              <div style={{
                position: "absolute", inset: 0,
                borderRadius: "0 16px 16px 4px",
                background: "rgba(255,255,255,0.015)",
                transform: "translate(3px,2.5px)", zIndex: 0,
              }} />

              {/* ── Main animated page ── */}
              <div
                id="menu-book-page"
                style={{
                  position: "relative", zIndex: 1,
                  background: "linear-gradient(160deg, #ffffff 0%, #fcfbfa 100%)",
                  borderRadius: "0 16px 16px 4px",
                  border: "1px solid #e7e5e4",
                  borderLeft: "5px solid rgba(0, 0, 0, 0.08)",
                  boxShadow: "-7px 0 0 rgba(0,0,0,0.1), 0 22px 55px rgba(0,0,0,0.15), inset 12px 0 28px rgba(0,0,0,0.05)",
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
                  const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
                  if (Math.abs(dx) > 55 && dy < 100) {
                    const curIdx = categories.findIndex((c) => c.id === selectedCat);
                    if (dx > 0 && curIdx < categories.length - 1)
                      navigateCategory(categories[curIdx + 1].id, "forward");
                    else if (dx < 0 && curIdx > 0)
                      navigateCategory(categories[curIdx - 1].id, "backward");
                  }
                }}
              >
                {/* Spine gradient shadow */}
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: "32px",
                  background: "linear-gradient(to right, rgba(0,0,0,0.2), transparent)",
                  pointerEvents: "none", zIndex: 10,
                }} />

                {/* Page content */}
                {(() => {
                  const currentCat = categories.find((c) => c.id === selectedCat);
                  if (!currentCat) return null;
                  const catIdx = categories.findIndex((c) => c.id === selectedCat);
                  const catProducts = products.filter(
                    (p) => p.category.id === selectedCat && p.isAvailable
                  );

                  return (
                    <>
                      {/* Category heading */}
                      <div style={{ textAlign: "center", marginBottom: "26px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${currentCat.color || s.primary}55)` }} />
                          <span style={{ color: `${currentCat.color || s.primary}99`, fontSize: "14px" }}>✦</span>
                          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${currentCat.color || s.primary}55)` }} />
                        </div>

                        <h2 style={{
                          fontFamily: "var(--font-caveat), 'Georgia', serif",
                          fontSize: "38px",
                          color: currentCat.color || s.primary,
                          margin: 0,
                          letterSpacing: "2px",
                          fontWeight: "normal",
                          textShadow: `0 0 40px ${currentCat.color || s.primary}33`,
                        }}>
                          {currentCat.name}
                        </h2>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #e7e5e4)" }} />
                          <span style={{ fontSize: "10px", color: "#57534e", letterSpacing: "4px" }}>
                            {catIdx + 1} / {categories.length}
                          </span>
                          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #e7e5e4)" }} />
                        </div>
                      </div>

                      {/* Items */}
                      {catProducts.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "60px 20px", color: "#57534e", fontStyle: "italic" }}>
                          No items available in this category
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                          {catProducts.map((product) => {
                            const inCart = cart.find((i) => i.productId === product.id);
                            const imgSrc = getProductImage(product.name);
                            return (
                              <div
                                key={product.id}
                                className="menu-item-row"
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: "12px",
                                  padding: "8px",
                                  borderRadius: "10px",
                                  transition: "background 0.2s",
                                  cursor: "default",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "baseline" }}>
                                    <span style={{ fontSize: "16px", fontWeight: "700", color: "#1c1917" }}>
                                      {product.name}
                                    </span>
                                    <div style={{
                                      flex: 1, borderBottom: "2px dotted rgba(0,0,0,0.15)",
                                      margin: "0 10px", alignSelf: "center",
                                      position: "relative", top: "-3px",
                                    }} />
                                    <span style={{ fontSize: "16px", fontWeight: "700", color: currentCat.color || s.primary, flexShrink: 0 }}>
                                      {formatCurrency(Number(product.price))}
                                    </span>
                                  </div>

                                  {product.description && (
                                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#57534e", lineHeight: 1.4, fontStyle: "italic" }}>
                                      {product.description}
                                    </p>
                                  )}

                                  <div style={{ marginTop: "10px" }}>
                                    {inCart ? (
                                      <div style={{
                                        display: "inline-flex", alignItems: "center", gap: "8px",
                                        background: "rgba(0,0,0,0.05)", padding: "3px 6px",
                                        borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)",
                                      }}>
                                        <button
                                          onClick={() => updateQty(product.id, inCart.quantity - 1)}
                                          style={{ width: "24px", height: "24px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                          <span style={{ fontSize: "16px", fontWeight: "800", color: "#1c1917", lineHeight: 1, position: "relative", top: "-1px" }}>−</span>
                                        </button>
                                        <span style={{ fontSize: "14px", fontWeight: "700", minWidth: "14px", textAlign: "center", color: "#1c1917" }}>
                                          {inCart.quantity}
                                        </span>
                                        <button
                                          onClick={() => updateQty(product.id, inCart.quantity + 1)}
                                          style={{ width: "24px", height: "24px", borderRadius: "6px", background: currentCat.color || s.primary, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                          <span style={{ fontSize: "16px", fontWeight: "800", color: "#fff", lineHeight: 1, position: "relative", top: "-1px" }}>+</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => addToCart(product)}
                                        style={{
                                          padding: "5px 12px", borderRadius: "8px",
                                          background: "transparent",
                                          border: `1px solid ${(currentCat.color || s.primary) + "55"}`,
                                          color: currentCat.color || s.primary,
                                          fontSize: "12px", fontWeight: "600", cursor: "pointer",
                                        }}
                                      >
                                        + Add
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {imgSrc && (
                                  <div style={{
                                    width: "80px", height: "80px",
                                    borderRadius: "10px", overflow: "hidden",
                                    flexShrink: 0, border: `1px solid ${s.border}`,
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                  }}>
                                    <img
                                      src={imgSrc} alt={product.name}
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Bottom ornament */}
                      <div style={{ marginTop: "28px", textAlign: "center", color: `${s.muted}44`, fontSize: "16px", letterSpacing: "10px" }}>
                        ✦ ✦ ✦
                      </div>
                    </>
                  );
                })()}

                {/* Page-corner curl */}
                <div style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 0, height: 0, borderStyle: "solid",
                  borderWidth: "0 0 38px 38px",
                  borderColor: `transparent transparent ${s.bg} transparent`,
                  opacity: 0.65,
                }} />
              </div>
            </div>

            {/* Navigation bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
              <button
                id="menu-prev-page"
                onClick={() => {
                  const idx = categories.findIndex((c) => c.id === selectedCat);
                  if (idx > 0) navigateCategory(categories[idx - 1].id, "backward");
                }}
                disabled={flipPhase !== "idle" || categories.findIndex((c) => c.id === selectedCat) <= 0}
                style={{
                  padding: "10px 18px", borderRadius: "12px",
                  background: s.card, border: `1px solid ${s.border}`,
                  color: s.text, fontWeight: "600", fontSize: "14px",
                  cursor: (categories.findIndex((c) => c.id === selectedCat) <= 0 || flipPhase !== "idle") ? "not-allowed" : "pointer",
                  opacity: (categories.findIndex((c) => c.id === selectedCat) <= 0 || flipPhase !== "idle") ? 0.35 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                ← Prev
              </button>

              {/* Dot indicators */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      const curIdx = categories.findIndex((c) => c.id === selectedCat);
                      const tgtIdx = categories.findIndex((c) => c.id === cat.id);
                      if (tgtIdx !== curIdx) navigateCategory(cat.id, tgtIdx > curIdx ? "forward" : "backward");
                    }}
                    style={{
                      width: cat.id === selectedCat ? "22px" : "7px",
                      height: "7px", borderRadius: "4px",
                      background: cat.id === selectedCat ? (cat.color || s.primary) : s.border,
                      transition: "all 0.38s cubic-bezier(0.34,1.56,0.64,1)",
                      cursor: "pointer",
                      boxShadow: cat.id === selectedCat ? `0 0 8px ${cat.color || s.primary}66` : "none",
                    }}
                  />
                ))}
              </div>

              <button
                id="menu-next-page"
                onClick={() => {
                  const idx = categories.findIndex((c) => c.id === selectedCat);
                  if (idx < categories.length - 1) navigateCategory(categories[idx + 1].id, "forward");
                }}
                disabled={flipPhase !== "idle" || categories.findIndex((c) => c.id === selectedCat) >= categories.length - 1}
                style={{
                  padding: "10px 18px", borderRadius: "12px",
                  background: s.card, border: `1px solid ${s.border}`,
                  color: s.text, fontWeight: "600", fontSize: "14px",
                  cursor: (categories.findIndex((c) => c.id === selectedCat) >= categories.length - 1 || flipPhase !== "idle") ? "not-allowed" : "pointer",
                  opacity: (categories.findIndex((c) => c.id === selectedCat) >= categories.length - 1 || flipPhase !== "idle") ? 0.35 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Cart bottom bar */}
          {cartCount > 0 && !showCart && (
            <div
              style={{
                position: "fixed", bottom: 0, left: 0, right: 0,
                padding: "16px",
                background: "rgba(15,15,19,0.98)",
                backdropFilter: "blur(12px)",
                borderTop: `1px solid ${s.border}`,
                zIndex: 90,
              }}
            >
              <button
                id="view-cart-bottom"
                onClick={() => setShowCart(true)}
                style={{
                  width: "100%", padding: "15px", borderRadius: "12px",
                  background: `linear-gradient(135deg, ${s.primary}, #a06030)`,
                  color: "#fff", fontWeight: "700", fontSize: "16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  boxShadow: "0 8px 24px rgba(200,121,65,0.3)",
                  border: "none", cursor: "pointer",
                }}
              >
                <span style={{ background: "rgba(0,0,0,0.2)", padding: "2px 10px", borderRadius: "999px" }}>
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
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }}
                onClick={() => setShowCart(false)}
              />
              <div
                style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: s.card, borderRadius: "20px 20px 0 0",
                  padding: "20px", maxHeight: "80vh", overflowY: "auto",
                  animation: "slideUp 0.3s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>Your Cart</h3>
                  <button
                    onClick={() => setShowCart(false)}
                    style={{ background: s.border, color: s.muted, padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer" }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {cart.map((item) => (
                  <div
                    key={item.productId}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${s.border}` }}
                  >
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>{item.name}</div>
                      <div style={{ fontSize: "13px", color: s.primary }}>{formatCurrency(item.price)} ea.</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        style={{ width: "28px", height: "28px", borderRadius: "7px", background: s.border, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
                      >
                        <span style={{ fontSize: "16px", fontWeight: "800", color: s.text, lineHeight: 1, position: "relative", top: "-1px" }}>−</span>
                      </button>
                      <span style={{ fontWeight: "700" }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        style={{ width: "28px", height: "28px", borderRadius: "7px", background: s.primary, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
                      >
                        <span style={{ fontSize: "16px", fontWeight: "800", color: "#fff", lineHeight: 1, position: "relative", top: "-1px" }}>+</span>
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ padding: "16px 0 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: s.muted, marginBottom: "4px" }}>
                    <span>Subtotal</span><span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: s.muted, marginBottom: "12px" }}>
                    <span>Tax</span><span>{formatCurrency(cartTax)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "800", marginBottom: "20px" }}>
                    <span>Total</span>
                    <span style={{ color: s.primary }}>{formatCurrency(cartTotal + cartTax)}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: s.muted, textAlign: "center", marginBottom: "16px" }}>
                    This is a browse-only view. To place an order, please scan the QR code on your table.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
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
          0%   { transform: perspective(1400px) rotateY(90deg);           filter: brightness(0.08); }
          58%  { transform: perspective(1400px) rotateY(-11deg) scale(1.008); filter: brightness(1.12); }
          76%  { transform: perspective(1400px) rotateY(5deg)   scale(1);  filter: brightness(1); }
          88%  { transform: perspective(1400px) rotateY(-2.5deg); }
          95%  { transform: perspective(1400px) rotateY(1deg); }
          100% { transform: perspective(1400px) rotateY(0deg);            filter: brightness(1); }
        }
        @keyframes pageFlipInReverse {
          0%   { transform: perspective(1400px) rotateY(-90deg);          filter: brightness(0.08); }
          58%  { transform: perspective(1400px) rotateY(11deg) scale(1.008);  filter: brightness(1.12); }
          76%  { transform: perspective(1400px) rotateY(-5deg) scale(1);  filter: brightness(1); }
          88%  { transform: perspective(1400px) rotateY(2.5deg); }
          95%  { transform: perspective(1400px) rotateY(-1deg); }
          100% { transform: perspective(1400px) rotateY(0deg);            filter: brightness(1); }
        }

        #menu-book-tabs::-webkit-scrollbar { display: none; }
        .menu-item-row:active { background: rgba(255,255,255,0.06) !important; }
      `}</style>
    </div>
  );
}
