"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;

export default function CustomerLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  // Check if already logged in
  useEffect(() => {
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          // Already logged in — go to menu
          router.push("/customer/menu");
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false));
  }, [router]);

  const handleLogin = async (data: LoginInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const json = await res.json();
      setLoading(false);
      if (!json.ok) {
        setError(json.error);
        return;
      }
      router.push("/customer/menu");
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  const handleRegister = async (data: RegisterInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      });
      const json = await res.json();
      setLoading(false);
      if (!json.ok) {
        setError(json.error);
        return;
      }
      router.push("/customer/menu");
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f0eee8",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "15px",
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "#8a8a9a",
    marginBottom: "6px",
    display: "block",
    fontWeight: "500",
  };

  const errorTextStyle: React.CSSProperties = {
    color: "#f87171",
    fontSize: "12px",
    marginTop: "4px",
  };

  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0f13 0%, #1a1a24 100%)",
          color: "#8a8a9a",
          fontSize: "16px",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f0f13 0%, #1a1a24 50%, #0f0f13 100%)",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(200, 121, 65, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: "420px", animation: "fadeIn 0.4s ease both" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #c87941, #a06030)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              margin: "0 auto 16px",
              boxShadow: "0 0 40px rgba(200, 121, 65, 0.3)",
            }}
          >
            ☕
          </div>
          <h1
            className="font-caveat"
            style={{
              fontSize: "42px",
              fontWeight: "700",
              margin: "0 0 8px",
              background: "linear-gradient(135deg, #f0eee8, #c87941)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Café Odoo
          </h1>
          <p style={{ color: "#8a8a9a", fontSize: "14px", margin: 0 }}>
            Customer Portal — Sign in to browse the menu
          </p>
        </div>

        {/* Auth card */}
        <div
          style={{
            background: "rgba(26,26,36,0.9)",
            border: "1px solid rgba(42,42,58,0.8)",
            borderRadius: "20px",
            padding: "28px",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Mode Toggle */}
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "10px",
              padding: "4px",
              marginBottom: "20px",
            }}
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                id={`customer-mode-${m}`}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: "7px",
                  background: mode === m ? "linear-gradient(135deg, #c87941, #a06030)" : "transparent",
                  color: mode === m ? "#fff" : "#8a8a9a",
                  fontWeight: "600",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "8px",
                padding: "12px 16px",
                color: "#f87171",
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  id="customer-login-email"
                  type="email"
                  style={inputStyle}
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p style={errorTextStyle}>{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  id="customer-login-password"
                  type="password"
                  style={inputStyle}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <p style={errorTextStyle}>{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <button
                id="customer-login-submit"
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "8px",
                  background: loading ? "#5a3a20" : "linear-gradient(135deg, #c87941, #a06030)",
                  color: "#fff",
                  padding: "14px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "15px",
                  boxShadow: loading ? "none" : "0 4px 16px rgba(200,121,65,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  width: "100%",
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === "register" && (
            <form
              onSubmit={registerForm.handleSubmit(handleRegister)}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div>
                <label style={labelStyle}>Your Name</label>
                <input
                  id="customer-reg-name"
                  style={inputStyle}
                  placeholder="e.g. Aryan"
                  autoComplete="name"
                  {...registerForm.register("name")}
                />
                {registerForm.formState.errors.name && (
                  <p style={errorTextStyle}>{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  id="customer-reg-email"
                  type="email"
                  style={inputStyle}
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p style={errorTextStyle}>{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  id="customer-reg-password"
                  type="password"
                  style={inputStyle}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors.password && (
                  <p style={errorTextStyle}>{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <button
                id="customer-reg-submit"
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "8px",
                  background: loading ? "#5a3a20" : "linear-gradient(135deg, #c87941, #a06030)",
                  color: "#fff",
                  padding: "14px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "15px",
                  boxShadow: loading ? "none" : "0 4px 16px rgba(200,121,65,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  width: "100%",
                }}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "13px",
            color: "#5a5a6a",
            marginBottom: "16px",
          }}
        >
          Scan the QR code on your table for table-linked ordering
        </div>

        {/* Not a Customer Button */}
        <div
          style={{
            textAlign: "center",
          }}
        >
          <a
            href="http://localhost:3001/login"
            id="not-a-customer-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 20px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#8a8a9a",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.color = "#f0eee8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              e.currentTarget.style.color = "#8a8a9a";
            }}
          >
            Not a Customer?
          </a>
        </div>
      </div>
    </div>
  );
}
