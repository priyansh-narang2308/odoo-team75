"use client";

import { useState } from "react";
import { X, Mail, Send } from "lucide-react";

interface EmailReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
  defaultEmail?: string;
}

export function EmailReceiptModal({
  isOpen,
  onClose,
  onSend,
  defaultEmail = "",
}: EmailReceiptModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;

    setIsSending(true);
    try {
      await onSend(email.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "var(--color-bg-primary)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "400px",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
            <Mail size={18} color="var(--color-primary)" />
            Email Receipt
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-faint)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSend} style={{ padding: "20px" }}>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--color-text-muted)" }}>
            Enter the customer's email address to send a digital copy of the receipt.
          </p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            required
            autoFocus
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              fontSize: "14px",
              outline: "none",
              marginBottom: "20px",
            }}
          />

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !email.trim() || !email.includes("@")}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: "var(--color-primary)",
                color: "#fff",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: (isSending || !email.trim() || !email.includes("@")) ? "not-allowed" : "pointer",
                opacity: (isSending || !email.trim() || !email.includes("@")) ? 0.6 : 1,
              }}
            >
              {isSending ? "Sending..." : "Send"}
              {!isSending && <Send size={16} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
