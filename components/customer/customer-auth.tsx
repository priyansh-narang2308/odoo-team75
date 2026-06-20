/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  customerRegisterSchema,
  customerLoginSchema,
} from "@/lib/validations/auth";
import type { z } from "zod";
import Image from "next/image";
import toast from "react-hot-toast";

type RegisterInput = z.infer<typeof customerRegisterSchema>;
type LoginInput = z.infer<typeof customerLoginSchema>;

interface Props {
  tableId: string;
  tableNumber: string;
  floorName: string;
  onSuccess: (session: any) => void;
}

export function CustomerAuth({
  tableId,
  tableNumber,
  floorName,
  onSuccess,
}: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: { tableId },
  });

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(customerLoginSchema),
    defaultValues: { tableId },
  });

  const handleRegister = async (data: RegisterInput) => {
    setLoading(true);
    const res = await fetch("/api/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      toast.error(json.error);
      return;
    }
    toast.success("Account created successfully!");
    onSuccess(json.data);
  };

  const handleLogin = async (data: LoginInput) => {
    setLoading(true);
    const res = await fetch("/api/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      toast.error(json.error);
      return;
    }
    toast.success("Signed in successfully!");
    onSuccess(json.data);
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#F6E1E6",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "15px",
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-elevated) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(var(--color-primary-rgb),0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          animation: "fadeIn 0.4s ease",
        }}
      >
        {/* Table badge */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Image
              src="/CafePOS.png"
              alt="CafePOS Logo"
              width={80}
              height={80}
              style={{ objectFit: "contain" }}
            />
          </div>
          <h1
            style={{
              margin: "0 0 6px",
              fontSize: "26px",
              fontWeight: "800",
              background:
                "linear-gradient(135deg, #F6E1E6, var(--color-primary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Café Odoo
          </h1>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(var(--color-primary-rgb),0.15)",
              border: "1px solid rgba(var(--color-primary-rgb),0.3)",
              borderRadius: "999px",
              padding: "5px 14px",
              fontSize: "14px",
              color: "var(--color-primary)",
              fontWeight: "600",
            }}
          >
            📍 {floorName} · Table {tableNumber}
          </div>
        </div>

        {/* Card */}
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
              marginBottom: "24px",
            }}
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                id={`auth-mode-${m}`}
                onClick={() => {
                  setMode(m);
                }}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: "7px",
                  background:
                    mode === m ? "var(--color-primary)" : "transparent",
                  color: mode === m ? "#fff" : "var(--color-text-muted)",
                  fontWeight: "600",
                  fontSize: "14px",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {mode === "register" ? (
            <form
              onSubmit={registerForm.handleSubmit(handleRegister)}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <input
                type="hidden"
                {...registerForm.register("tableId")}
                value={tableId}
              />
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#E6A8B7",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Your Name
                </label>
                <input
                  id="reg-name"
                  style={inputStyle}
                  placeholder="John Doe"
                  {...registerForm.register("name")}
                />
                {registerForm.formState.errors.name && (
                  <p
                    style={{
                      color: "#f87171",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    {registerForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#E6A8B7",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  style={inputStyle}
                  placeholder="you@example.com"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p
                    style={{
                      color: "#f87171",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#E6A8B7",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  style={inputStyle}
                  placeholder="••••••••"
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors.password && (
                  <p
                    style={{
                      color: "#f87171",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <button
                id="reg-submit"
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "8px",
                  background: loading
                    ? "#5a3a20"
                    : "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                  color: "#fff",
                  padding: "14px",
                  justifyContent: "center",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "15px",
                  boxShadow: "0 4px 16px rgba(var(--color-primary-rgb),0.25)",
                }}
              >
                {loading ? "Creating account..." : "Create Account & Order"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <input
                type="hidden"
                {...loginForm.register("tableId")}
                value={tableId}
              />
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#E6A8B7",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  style={inputStyle}
                  placeholder="you@example.com"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p
                    style={{
                      color: "#f87171",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#E6A8B7",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  style={inputStyle}
                  placeholder="••••••••"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <p
                    style={{
                      color: "#f87171",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "8px",
                  background: loading
                    ? "#5a3a20"
                    : "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                  color: "#fff",
                  padding: "14px",
                  justifyContent: "center",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "15px",
                  boxShadow: "0 4px 16px rgba(var(--color-primary-rgb),0.25)",
                }}
              >
                {loading ? "Signing in..." : "Sign In & Order"}
              </button>
            </form>
          )}
        </div>

        {/* Not a Customer Button */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
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
              color: "#E6A8B7",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.color = "#F6E1E6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              e.currentTarget.style.color = "#E6A8B7";
            }}
          >
            Not a Customer?
          </a>
        </div>
      </div>
    </div>
  );
}
