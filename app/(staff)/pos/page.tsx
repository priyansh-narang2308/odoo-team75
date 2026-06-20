/* eslint-disable react-hooks/immutability */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface SessionData {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  closingAmount: number | null;
  orders?: {
    payments: { method: { type: string }; amount: number }[];
  }[];
}

export default function SessionDashboard() {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [lastSession, setLastSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [openingFloat, setOpeningFloat] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const [activeRes, lastRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/sessions/last"),
      ]);

      const activeData = await activeRes.json();
      const lastData = await lastRes.json();

      if (activeData.ok && activeData.data) {
        setActiveSession(activeData.data);
      } else {
        setActiveSession(null);
      }

      if (lastData.ok && lastData.data) {
        setLastSession(lastData.data);
      }
    } catch {
      toast.error("Failed to load session data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amt = parseFloat(openingFloat);
      if (isNaN(amt) || amt < 0) {
        toast.error("Enter a valid opening float amount");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingAmount: amt }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Session opened successfully");
        router.push("/pos/terminal");
      } else {
        toast.error(data.error || "Failed to open session");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    setSubmitting(true);
    try {
      const amt = parseFloat(closingAmount);
      if (isNaN(amt) || amt < 0) {
        toast.error("Enter a valid closing amount");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/sessions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          closingAmount: amt,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Session closed successfully");
        setShowCloseModal(false);
        setClosingAmount("");
        fetchSessions(); // Refresh data
      } else {
        toast.error(data.error || "Failed to close session");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateExpectedCash = () => {
    if (!activeSession) return 0;
    let expected = Number(activeSession.openingAmount) || 0;

    if (activeSession.orders) {
      activeSession.orders.forEach((order) => {
        order.payments.forEach((payment) => {
          if (
            payment.method.type === "CASH" ||
            payment.method.type === "UPI" ||
            payment.method.type === "CARD"
          ) {
            expected += Number(payment.amount);
          }
        });
      });
    }

    return expected;
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Loading session details...
      </div>
    );
  }

  const expectedCash = calculateExpectedCash();
  const actualCash = parseFloat(closingAmount) || 0;
  const variance = actualCash - expectedCash;

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "800px",
        margin: "0 auto",
        minHeight: "100vh",
        color: "var(--color-text)",
      }}
    >
      <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "32px" }}>
        POS Terminal Session
      </h1>

      {/* Last Session Details */}
      {lastSession && !activeSession && (
        <div
          style={{
            background: "var(--color-bg-elevated)",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            marginBottom: "32px",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              color: "var(--color-text-muted)",
              marginBottom: "12px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Last Closed Session
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "13px",
                  color: "var(--color-text-faint)",
                }}
              >
                Opened Date
              </p>
              <p style={{ margin: 0, fontWeight: "500" }}>
                {new Date(lastSession.openedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "13px",
                  color: "var(--color-text-faint)",
                }}
              >
                Closed Date
              </p>
              <p style={{ margin: 0, fontWeight: "500" }}>
                {lastSession.closedAt
                  ? new Date(lastSession.closedAt).toLocaleString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "13px",
                  color: "var(--color-text-faint)",
                }}
              >
                Opening Float
              </p>
              <p style={{ margin: 0, fontWeight: "500" }}>
                {formatCurrency(Number(lastSession.openingAmount))}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "13px",
                  color: "var(--color-text-faint)",
                }}
              >
                Closing Sale Amount
              </p>
              <p
                style={{
                  margin: 0,
                  fontWeight: "500",
                  color: "var(--color-primary)",
                }}
              >
                {formatCurrency(Number(lastSession.closingAmount))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Session OR Open Session Form */}
      {activeSession ? (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(34,197,94,0.05))",
            padding: "32px",
            borderRadius: "20px",
            border: "1px solid rgba(168,85,247,0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 10px #22c55e",
              }}
            ></span>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>
              Session Active
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "32px",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "14px",
                  color: "var(--color-text-muted)",
                }}
              >
                Opened At
              </p>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
                {new Date(activeSession.openedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "14px",
                  color: "var(--color-text-muted)",
                }}
              >
                Opening Float
              </p>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
                {formatCurrency(Number(activeSession.openingAmount))}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "14px",
                  color: "var(--color-text-muted)",
                }}
              >
                Expected Cash in Drawer
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "var(--color-primary)",
                }}
              >
                {formatCurrency(expectedCash)}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <button
              onClick={() => router.push("/pos/terminal")}
              style={{
                flex: 1,
                padding: "16px",
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "transform 0.1s",
              }}
            >
              Resume Terminal
            </button>
            <button
              onClick={() => setShowCloseModal(true)}
              style={{
                flex: 1,
                padding: "16px",
                background: "transparent",
                color: "#f87171",
                border: "1px solid rgba(248,113,113,0.3)",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(248,113,113,0.1)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              Close Session
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-bg-elevated)",
            padding: "32px",
            borderRadius: "20px",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2
            style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: "700" }}
          >
            Open New Session
          </h2>
          <p style={{ margin: "0 0 24px", color: "var(--color-text-muted)" }}>
            Enter your opening cash float to begin taking orders.
          </p>

          <form
            onSubmit={handleOpenSession}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Opening Cash Float (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                placeholder="e.g. 5000"
                required
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-overlay)",
                  color: "var(--color-text)",
                  fontSize: "18px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "16px",
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Opening..." : "Open Session & Launch Terminal"}
            </button>
          </form>
        </div>
      )}

      {/* Close Session Modal */}
      {showCloseModal && activeSession && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "480px",
              border: "1px solid var(--color-border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
                Close Session Summary
              </h3>
            </div>

            <form onSubmit={handleCloseSession}>
              <div
                style={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    background: "var(--color-bg-overlay)",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border-muted)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ color: "var(--color-text-muted)" }}>
                      Opening Float:
                    </span>
                    <span style={{ fontWeight: "500" }}>
                      {formatCurrency(Number(activeSession.openingAmount))}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ color: "var(--color-text-muted)" }}>
                      Expected Cash (System):
                    </span>
                    <span
                      style={{
                        fontWeight: "600",
                        color: "var(--color-primary)",
                      }}
                    >
                      {formatCurrency(expectedCash)}
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                    }}
                  >
                    Actual Counted Cash (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="Enter cash in drawer"
                    required
                    style={{
                      width: "100%",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg-overlay)",
                      color: "var(--color-text)",
                      fontSize: "24px",
                      fontWeight: "700",
                    }}
                  />
                </div>

                {closingAmount && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "16px",
                      borderRadius: "12px",
                      background:
                        variance === 0
                          ? "rgba(34,197,94,0.1)"
                          : variance > 0
                            ? "rgba(59,130,246,0.1)"
                            : "rgba(239,68,68,0.1)",
                      border: `1px solid ${variance === 0 ? "#22c55e" : variance > 0 ? "#3b82f6" : "#ef4444"}`,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "600",
                        color:
                          variance === 0
                            ? "#4ade80"
                            : variance > 0
                              ? "#60a5fa"
                              : "#f87171",
                      }}
                    >
                      Variance:
                    </span>
                    <span
                      style={{
                        fontWeight: "700",
                        color:
                          variance === 0
                            ? "#4ade80"
                            : variance > 0
                              ? "#60a5fa"
                              : "#f87171",
                      }}
                    >
                      {variance > 0 ? "+" : ""}
                      {formatCurrency(variance)}
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "24px",
                  background: "var(--color-bg-overlay)",
                  borderTop: "1px solid var(--color-border)",
                  display: "flex",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "transparent",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    borderRadius: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !closingAmount}
                  style={{
                    flex: 2,
                    padding: "14px",
                    background: "#f87171",
                    border: "none",
                    color: "white",
                    borderRadius: "12px",
                    fontWeight: "600",
                    cursor:
                      submitting || !closingAmount ? "not-allowed" : "pointer",
                    opacity: submitting || !closingAmount ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Closing..." : "Confirm & Close Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
