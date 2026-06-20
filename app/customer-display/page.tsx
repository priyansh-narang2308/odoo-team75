"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { formatCurrency } from "@/lib/utils";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartData {
  items: CartItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  storeName: string;
}

interface CheckoutData {
  grandTotal: number;
  upiId: string | null;
  storeName: string;
}

type DisplayState = "IDLE" | "CART" | "CHECKOUT" | "SUCCESS";

export default function CustomerDisplayPage() {
  const { socket } = useSocket();
  const [displayState, setDisplayState] = useState<DisplayState>("IDLE");
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [storeName, setStoreName] = useState("The Purple Cup Cafe");

  // Fetch store name
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data?.storeName) setStoreName(d.data.storeName);
      })
      .catch(() => {});
  }, []);

  const handleSync = useCallback((data: CartData) => {
    if (data.items && data.items.length > 0) {
      setCartData(data);
      setDisplayState("CART");
    } else {
      setDisplayState("IDLE");
      setCartData(null);
    }
  }, []);

  const handleCheckout = useCallback((data: CheckoutData) => {
    setCheckoutData(data);
    setDisplayState("CHECKOUT");
  }, []);

  const handleSuccess = useCallback(() => {
    setDisplayState("SUCCESS");
    setTimeout(() => {
      setDisplayState("IDLE");
      setCartData(null);
      setCheckoutData(null);
    }, 8000);
  }, []);

  const handleIdle = useCallback(() => {
    setDisplayState("IDLE");
    setCartData(null);
    setCheckoutData(null);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.CUSTOMER_DISPLAY_SYNC, handleSync);
    socket.on(SOCKET_EVENTS.CUSTOMER_DISPLAY_CHECKOUT, handleCheckout);
    socket.on(SOCKET_EVENTS.CUSTOMER_DISPLAY_SUCCESS, handleSuccess);
    socket.on(SOCKET_EVENTS.CUSTOMER_DISPLAY_IDLE, handleIdle);

    return () => {
      socket.off(SOCKET_EVENTS.CUSTOMER_DISPLAY_SYNC, handleSync);
      socket.off(SOCKET_EVENTS.CUSTOMER_DISPLAY_CHECKOUT, handleCheckout);
      socket.off(SOCKET_EVENTS.CUSTOMER_DISPLAY_SUCCESS, handleSuccess);
      socket.off(SOCKET_EVENTS.CUSTOMER_DISPLAY_IDLE, handleIdle);
    };
  }, [socket, handleSync, handleCheckout, handleSuccess, handleIdle]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0d0d1a",
        color: "#fff",
        display: "flex",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Subtle animated background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(59,130,246,0.06) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      {/* ─── LEFT PANEL: Welcome ─── */}
      <div
        style={{
          width: "35%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px",
          position: "relative",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.3))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "28px",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(124,58,237,0.2)",
          }}
        >
          <span style={{ fontSize: "36px" }}>☕</span>
        </div>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: "300",
            color: "rgba(255,255,255,0.5)",
            margin: "0 0 8px",
            letterSpacing: "0.02em",
          }}
        >
          Welcome to
        </h2>
        <h1
          style={{
            fontSize: "42px",
            fontWeight: "800",
            background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: "0",
            textAlign: "center",
          }}
        >
          {storeName}
        </h1>
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "12px",
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Powered by Odoo
        </div>
      </div>

      {/* ─── RIGHT PANEL: Dynamic Content ─── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px",
          position: "relative",
        }}
      >
        {/* IDLE STATE */}
        {displayState === "IDLE" && (
          <div
            style={{
              textAlign: "center",
              animation: "fadeIn 0.5s ease",
            }}
          >
            <div
              style={{
                fontSize: "64px",
                marginBottom: "20px",
                opacity: 0.3,
              }}
            >
              🛒
            </div>
            <p
              style={{
                fontSize: "20px",
                color: "rgba(255,255,255,0.3)",
                fontWeight: "400",
              }}
            >
              Your order will appear here
            </p>
          </div>
        )}

        {/* CART STATE */}
        {displayState === "CART" && cartData && (
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              animation: "fadeIn 0.3s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "50vh",
                overflowY: "auto",
                paddingRight: "8px",
              }}
            >
              {cartData.items.map((item) => (
                <div
                  key={item.productId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Product image or icon */}
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "10px",
                      background:
                        "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "20px" }}>🍽️</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#fff",
                      }}
                    >
                      {item.quantity} × {item.name}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      color: "#a78bfa",
                    }}
                  >
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div
              style={{
                marginTop: "28px",
                padding: "20px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "15px",
                }}
              >
                <span>Sub Total:</span>
                <span>{formatCurrency(cartData.subtotal)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "15px",
                }}
              >
                <span>Tax:</span>
                <span>{formatCurrency(cartData.taxTotal)}</span>
              </div>
              {cartData.discountTotal > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#4ade80",
                    fontSize: "15px",
                  }}
                >
                  <span>Discount:</span>
                  <span>-{formatCurrency(cartData.discountTotal)}</span>
                </div>
              )}
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  paddingTop: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "22px",
                  fontWeight: "800",
                }}
              >
                <span>Total:</span>
                <span
                  style={{
                    background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {formatCurrency(cartData.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {displayState === "CHECKOUT" && checkoutData && (
          <div
            style={{
              textAlign: "center",
              animation: "fadeIn 0.4s ease",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "28px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              UPI QR
            </h2>
            <div
              style={{
                background: "#fff",
                borderRadius: "20px",
                padding: "24px",
                display: "inline-block",
                marginBottom: "24px",
                boxShadow: "0 8px 40px rgba(124,58,237,0.3)",
              }}
            >
              <div
                style={{
                  width: "200px",
                  height: "200px",
                  background: `url('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `upi://pay?pa=${checkoutData.upiId || "cafe@upi"}&pn=${storeName}&am=${checkoutData.grandTotal}&cu=INR`,
                  )}')`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
              />
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "10px",
                  color: "#666",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                SCAN ME
              </div>
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "800",
                background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Amount: {formatCurrency(checkoutData.grandTotal)}
            </div>
          </div>
        )}

        {displayState === "SUCCESS" && (
          <div
            style={{
              textAlign: "center",
              animation: "fadeIn 0.5s ease",
            }}
          >
            <div
              style={{
                fontSize: "80px",
                marginBottom: "24px",
                animation: "bounce 1s ease infinite",
              }}
            >
              🎉
            </div>
            <h1
              style={{
                fontSize: "36px",
                fontWeight: "700",
                color: "#fff",
                marginBottom: "12px",
                lineHeight: "1.3",
              }}
            >
              Thank you for shopping with us
            </h1>
            <p
              style={{
                fontSize: "22px",
                color: "rgba(255,255,255,0.4)",
                fontWeight: "400",
              }}
            >
              See you again
            </p>
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
