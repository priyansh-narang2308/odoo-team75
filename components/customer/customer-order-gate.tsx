"use client";

import { useState, useEffect } from "react";
import { CustomerAuth } from "./customer-auth";
import { CustomerMenu } from "./customer-menu";

import Image from "next/image";

interface Props {
  tableId: string;
  tableToken: string;
  tableNumber: string;
  floorName: string;
}

interface CustomerSession {
  id: string;
  name: string;
  email: string;
  tableId: string;
}

export function CustomerOrderGate({
  tableId,
  tableToken,
  tableNumber,
  floorName,
}: Props) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [storeName, setStoreName] = useState("The Purple Cup Cafe");

  useEffect(() => {
    // Fetch store settings for background
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data) {
          if (d.data.menuBackgroundColor)
            setBgColor(d.data.menuBackgroundColor);
          // Always use 'The Purple Cup Cafe' regardless of DB setting
          setStoreName("The Purple Cup Cafe");
        }
      })
      .catch(() => {});

    // Check if customer already has a session
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.data.tableId === tableId) {
          setSession(data.data);
          setShowSplash(false); // Skip splash for returning customers
        }
      })
      .finally(() => setLoading(false));
  }, [tableId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f081d",
          color: "rgba(255,255,255,0.6)",
          fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              animation: "splashFloat 2s ease-in-out infinite",
              marginBottom: "16px",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a78bfa"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
          </div>
          <p
            style={{
              letterSpacing: "0.05em",
              color: "rgba(255,255,255,0.7)",
              fontWeight: "500",
            }}
          >
            Preparing Your Experience...
          </p>
        </div>
        <style>{`
          @keyframes splashFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
        `}</style>
      </div>
    );
  }

  // ──── SPLASH SCREEN ────
  if (showSplash && !session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f081d", // Deep elegant midnight black-purple
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        {/* Elegant ambient glow backlights */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(147, 51, 234, 0) 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0) 70%)",
            filter: "blur(50px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Elegant central card */}
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "28px",
            padding: "48px 32px",
            textAlign: "center",
            boxShadow:
              "0 24px 60px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.05)",
            zIndex: 1,
            animation: "splashFloat 6s ease-in-out infinite",
          }}
        >
          {/* Splash Hero Image */}
          <div
            style={{
              width: "100%",
              height: "220px",
              borderRadius: "18px",
              overflow: "hidden",
              marginBottom: "28px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              position: "relative",
            }}
          >
            <Image
              src="/purple_cup_splash.png"
              alt="The Purple Cup Café"
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          </div>

          {/* Store name */}
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "800",
              color: "#ffffff",
              margin: "0 0 16px",
              letterSpacing: "-0.03em",
              lineHeight: "1.2",
            }}
          >
            {storeName}
          </h1>

          {/* Table Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "999px",
              padding: "6px 16px",
              margin: "0 auto 12px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#a78bfa",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#e8e5ef",
                letterSpacing: "0.02em",
              }}
            >
              {floorName} · Table {tableNumber}
            </span>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.4)",
              margin: "0 0 40px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            Scan, Order & Enjoy
          </p>

          {/* Order Here CTA */}
          <button
            id="splash-order-btn"
            onClick={async () => {
              try {
                const res = await fetch("/api/customer/guest", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tableId, tableNumber }),
                });
                const data = await res.json();
                if (data.ok) {
                  setSession(data.data);
                  setShowSplash(false);
                } else {
                  console.error("Guest login failed:", data.error);
                }
              } catch (e) {
                console.error("Guest login error:", e);
              }
            }}
            style={{
              width: "100%",
              padding: "16px 0",
              borderRadius: "16px",
              background: "#ffffff",
              color: "#1e0b36",
              fontSize: "17px",
              fontWeight: "750",
              border: "none",
              cursor: "pointer",
              boxShadow:
                "0 10px 30px rgba(255, 255, 255, 0.15), 0 4px 12px rgba(0, 0, 0, 0.2)",
              letterSpacing: "0.02em",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 15px 35px rgba(255, 255, 255, 0.25), 0 6px 18px rgba(0, 0, 0, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow =
                "0 10px 30px rgba(255, 255, 255, 0.15), 0 4px 12px rgba(0, 0, 0, 0.2)";
            }}
          >
            Order Here
          </button>
        </div>

        <style>{`
          @keyframes splashFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  if (!session) {
    return (
      <CustomerAuth
        tableId={tableId}
        tableNumber={tableNumber}
        floorName={floorName}
        onSuccess={setSession}
      />
    );
  }

  return (
    <CustomerMenu
      tableId={tableId}
      tableNumber={tableNumber}
      floorName={floorName}
      customer={session}
      onLogout={() => setSession(null)}
    />
  );
}
