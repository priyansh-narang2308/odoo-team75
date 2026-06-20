"use client";

import { useState, useEffect } from "react";
import {
  Smartphone,
  QrCode,
  Globe,
  Palette,
  ExternalLink,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";

interface StoreSettings {
  id: string;
  storeName: string;
  storeUpiId: string | null;
  isSelfOrderingEnabled: boolean;
  menuMode: string;
  menuBackgroundColor: string;
  menuBackgroundImage1: string | null;
  menuBackgroundImage2: string | null;
  menuBackgroundImage3: string | null;
}

export function MobileOrderSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setSettings(d.data);
        setLoading(false);
      });
  }, []);

  const save = async (partial: Partial<StoreSettings>) => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const d = await res.json();
      if (d.ok) {
        setSettings(d.data);
        toast.success("Settings saved");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "28px", color: "var(--color-text-faint)" }}>
        Loading settings...
      </div>
    );
  }

  if (!settings) return null;

  const bgColors = [
    "#1a1a2e",
    "#0d1b2a",
    "#1b1b2f",
    "#2d132c",
    "#16213e",
    "#0f3460",
    "#1a1a40",
    "#3a0ca3",
  ];

  return (
    <div style={{ padding: "28px", maxWidth: "800px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "26px", fontWeight: "800" }}>
        Mobile Order
      </h1>
      <p
        style={{
          margin: "0 0 28px",
          color: "var(--color-text-faint)",
          fontSize: "14px",
        }}
      >
        Configure how customers interact with your digital menu
      </p>

      <div
        className="card"
        style={{
          padding: "24px",
          marginBottom: "20px",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <Smartphone size={20} color="var(--color-primary)" />
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
            Self Ordering
          </h3>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px",
            background: "var(--color-bg-overlay)",
            borderRadius: "10px",
            cursor: "pointer",
            border: `1px solid ${settings.isSelfOrderingEnabled ? "rgba(var(--color-primary-rgb),0.4)" : "var(--color-border)"}`,
            marginBottom: "12px",
          }}
        >
          <input
            type="checkbox"
            checked={settings.isSelfOrderingEnabled}
            onChange={(e) => {
              const updated = {
                ...settings,
                isSelfOrderingEnabled: e.target.checked,
              };
              setSettings(updated);
              save({ isSelfOrderingEnabled: e.target.checked });
            }}
            style={{
              width: "18px",
              height: "18px",
              accentColor: "var(--color-primary)",
            }}
          />
          <div>
            <div style={{ fontWeight: "600", fontSize: "14px" }}>
              Enable Self Ordering
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--color-text-faint)",
                marginTop: "2px",
              }}
            >
              Customers can place orders from their phones
            </div>
          </div>
        </label>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button
            onClick={() => {
              const updated = { ...settings, menuMode: "ONLINE_ORDERING" };
              setSettings(updated);
              save({ menuMode: "ONLINE_ORDERING" });
            }}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "10px",
              border: `2px solid ${settings.menuMode === "ONLINE_ORDERING" ? "var(--color-primary)" : "var(--color-border)"}`,
              background:
                settings.menuMode === "ONLINE_ORDERING"
                  ? "rgba(var(--color-primary-rgb),0.1)"
                  : "var(--color-bg-overlay)",
              color: "var(--color-text)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Globe
              size={20}
              color={
                settings.menuMode === "ONLINE_ORDERING"
                  ? "var(--color-primary)"
                  : "var(--color-text-faint)"
              }
            />
            <span style={{ fontWeight: "600", fontSize: "13px" }}>
              Online Ordering
            </span>
            <span
              style={{ fontSize: "11px", color: "var(--color-text-faint)" }}
            >
              Customers order & pay
            </span>
          </button>
          <button
            onClick={() => {
              const updated = { ...settings, menuMode: "QR_MENU" };
              setSettings(updated);
              save({ menuMode: "QR_MENU" });
            }}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "10px",
              border: `2px solid ${settings.menuMode === "QR_MENU" ? "var(--color-primary)" : "var(--color-border)"}`,
              background:
                settings.menuMode === "QR_MENU"
                  ? "rgba(var(--color-primary-rgb),0.1)"
                  : "var(--color-bg-overlay)",
              color: "var(--color-text)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <QrCode
              size={20}
              color={
                settings.menuMode === "QR_MENU"
                  ? "var(--color-primary)"
                  : "var(--color-text-faint)"
              }
            />
            <span style={{ fontWeight: "600", fontSize: "13px" }}>QR Menu</span>
            <span
              style={{ fontSize: "11px", color: "var(--color-text-faint)" }}
            >
              View only, not able to order
            </span>
          </button>
        </div>

        {settings.isSelfOrderingEnabled && (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/customer"
              target="_blank"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--color-bg-overlay)",
                border: "1px solid var(--color-border)",
                color: "var(--color-primary)",
                fontSize: "13px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={14} /> Preview Webpage
            </a>
            <button
              onClick={() => {
                // Generate a QR code download link
                const url = `${window.location.origin}/customer`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
                const a = document.createElement("a");
                a.href = qrUrl;
                a.download = "menu-qr-code.png";
                a.click();
                toast.success("QR Code downloading...");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--color-bg-overlay)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <Download size={14} /> Download QR Code
            </button>
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          padding: "24px",
          marginBottom: "20px",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <Palette size={20} color="var(--color-primary)" />
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
            Background
          </h3>
        </div>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "13px",
            color: "var(--color-text-faint)",
          }}
        >
          Open Color Picker with color input to customize your menu background
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          {bgColors.map((c) => (
            <div
              key={c}
              onClick={() => {
                const updated = { ...settings, menuBackgroundColor: c };
                setSettings(updated);
                save({ menuBackgroundColor: c });
              }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: c,
                cursor: "pointer",
                border:
                  settings.menuBackgroundColor === c
                    ? "3px solid var(--color-primary)"
                    : "2px solid transparent",
                boxShadow:
                  settings.menuBackgroundColor === c
                    ? "0 0 0 2px var(--color-bg-elevated)"
                    : "none",
                transition: "all 0.15s",
              }}
            />
          ))}

          <label
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: `linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff)`,
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid var(--color-border)",
            }}
          >
            <input
              type="color"
              value={settings.menuBackgroundColor}
              onChange={(e) => {
                const updated = {
                  ...settings,
                  menuBackgroundColor: e.target.value,
                };
                setSettings(updated);
              }}
              onBlur={() =>
                save({ menuBackgroundColor: settings.menuBackgroundColor })
              }
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: "14px", pointerEvents: "none" }}>+</span>
          </label>
        </div>

        {/* Preview */}
        <div
          style={{
            height: "100px",
            borderRadius: "12px",
            background: settings.menuBackgroundColor,
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Background Preview
        </div>
      </div>

      {/* Image Upload Card */}
      <div
        className="card"
        style={{
          padding: "24px",
          border: "1px solid var(--color-border)",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "700" }}>
          Image Upload
        </h3>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "13px",
            color: "var(--color-text-faint)",
          }}
        >
          Upload multiple images for your menu carousel background
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          {[1, 2, 3].map((n) => {
            const key = `menuBackgroundImage${n}` as keyof StoreSettings;
            const val = settings[key] as string | null;
            return (
              <div
                key={n}
                style={{
                  flex: 1,
                  height: "80px",
                  borderRadius: "10px",
                  border: "2px dashed var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-faint)",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: val
                    ? `url(${val}) center/cover`
                    : "var(--color-bg-overlay)",
                  cursor: "pointer",
                }}
                onClick={() =>
                  toast("Image upload requires cloud storage integration", {
                    icon: "📁",
                  })
                }
              >
                {val ? "" : `Image ${n}`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save indicator */}
      {saving && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "var(--color-primary)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: "600",
            fontSize: "13px",
            boxShadow: "0 4px 16px rgba(var(--color-primary-rgb),0.4)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          Saving...
        </div>
      )}
    </div>
  );
}
