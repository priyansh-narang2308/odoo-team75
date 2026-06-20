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

export function CustomerOrderGate({ tableId, tableToken, tableNumber, floorName }: Props) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [storeName, setStoreName] = useState("Café Odoo");

  useEffect(() => {
    // Fetch store settings for background
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data) {
          if (d.data.menuBackgroundColor) setBgColor(d.data.menuBackgroundColor);
          if (d.data.storeName) setStoreName(d.data.storeName);
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
          background: bgColor,
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <Image
              src="/CafePOS.png"
              alt="CafePOS Logo"
              width={80}
              height={80}
              style={{ objectFit: "contain" }}
            />
          </div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // ──── SPLASH SCREEN ────
  if (showSplash && !session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: bgColor,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          fontFamily: "inherit",
        }}
      >
        {/* Animated gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.1) 0%, transparent 50%)",
            animation: "splashPulse 4s ease-in-out infinite alternate",
            pointerEvents: "none",
          }}
        />

        {/* Floating circles decoration */}
        <div style={{ position: "absolute", top: "15%", left: "10%", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "8%", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", top: "60%", left: "5%", width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.02)" }} />

        {/* Logo */}
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "28px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "28px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            animation: "splashFloat 3s ease-in-out infinite",
          }}
        >
          <Image
            src="/CafePOS.png"
            alt="Logo"
            width={64}
            height={64}
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Store name */}
        <h1
          style={{
            fontSize: "38px",
            fontWeight: "800",
            color: "#fff",
            margin: "0 0 8px",
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          {storeName}
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "rgba(255,255,255,0.4)",
            margin: "0 0 6px",
            fontWeight: "400",
          }}
        >
          {floorName} · Table {tableNumber}
        </p>
        <p
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.25)",
            margin: "0 0 48px",
          }}
        >
          Scan, Order & Enjoy
        </p>

        {/* Order Here CTA */}
        <button
          id="splash-order-btn"
          onClick={() => setShowSplash(false)}
          style={{
            padding: "16px 60px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
            color: "#fff",
            fontSize: "18px",
            fontWeight: "700",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(124,58,237,0.4), 0 2px 8px rgba(0,0,0,0.3)",
            letterSpacing: "0.02em",
            transition: "all 0.2s ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          Order Here
        </button>

        {/* Powered by */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            fontSize: "11px",
            color: "rgba(255,255,255,0.15)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Powered by Odoo
        </div>

        <style>{`
          @keyframes splashPulse {
            0% { opacity: 0.7; }
            100% { opacity: 1; }
          }
          @keyframes splashFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
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
