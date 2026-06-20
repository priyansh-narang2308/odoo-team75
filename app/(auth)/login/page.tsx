"use client";

import { useState, useEffect } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffLoginSchema, type StaffLoginInput } from "@/lib/validations/auth";
import Image from "next/image";
import toast from "react-hot-toast";
import { z } from "zod";

const staffSignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type StaffSignupInput = z.infer<typeof staffSignupSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Use effect to set initial mode from URL to avoid Suspense boundary issues
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "signup") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMode("signup");
      }
    }
  }, []);

  // Login form
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    setValue,
    formState: { errors: loginErrors },
  } = useForm<StaffLoginInput>({
    resolver: zodResolver(staffLoginSchema),
  });

  // Signup form
  const {
    register: signupRegister,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors },
  } = useForm<StaffSignupInput>({
    resolver: zodResolver(staffSignupSchema),
  });

  const fillCredentials = (email: string, pass: string) => {
    setMode("login");
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
  };

  const onLogin = async (data: StaffLoginInput) => {
    setLoading(true);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Invalid email or password. Please try again.");
      return;
    }

    toast.success("Signed in successfully!");

    const session = await getSession();
    const destination = session?.user?.role === "KITCHEN" ? "/kds" : "/pos";

    router.push(destination);
    router.refresh();
  };

  const onSignup = async (data: StaffSignupInput) => {
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "Signup failed. Please try again.");
        setLoading(false);
        return;
      }

      toast.success("Account created! Signing you in...");

      // Auto-sign-in after successful signup
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      setLoading(false);

      if (signInResult?.error) {
        toast.error(
          "Account created, but auto-login failed. Please sign in manually.",
        );
        setMode("login");
        return;
      }

      const session = await getSession();
      const destination = session?.user?.role === "KITCHEN" ? "/kds" : "/pos";
      router.push(destination);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#F3F4F6",
      }}
    >
      <style>{`
        .split-right {
          display: none;
        }
        .split-left {
          flex: 1;
        }
        @media (min-width: 800px) {
          .split-right {
            display: block;
            flex: 1.2;
            background-image: url('/right.png');
            background-size: 75%;
            background-position: right 25%;
            background-repeat: no-repeat;
          }
          .split-left {
            flex: 1;
          }
        }
      `}</style>

      <div
        className="split-left"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          paddingLeft: "10%",
          position: "relative",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(113, 75, 103, 0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            marginTop: "6vh",
            animation: "fadeIn 0.4s ease both",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "800",
                color: "#111827",
                letterSpacing: "-0.03em",
              }}
            >
              Staff Portal
            </div>

            <div
              style={{
                marginTop: "8px",
                fontSize: "16px",
                color: "#6b7280",
              }}
            >
              {mode === "login"
                ? "Welcome back. Sign in to continue."
                : "Join your team and start managing operations."}
            </div>
          </div>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "20px",
              padding: "28px",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                background: "#F3F4F6",
                borderRadius: "10px",
                padding: "4px",
                marginBottom: "20px",
              }}
            >
              {(["login", "signup"] as const).map((tab) => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  type="button"
                  onClick={() => setMode(tab)}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: "7px",
                    border: "none",
                    background: mode === tab ? "#ffffff" : "transparent",
                    color: mode === tab ? "#714B67" : "#6b7280",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow:
                      mode === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {tab === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            {mode === "login" ? (
              /* ── LOGIN FORM ── */
              <form
                onSubmit={handleLoginSubmit(onLogin)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* Email */}
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "6px",
                      display: "block",
                      fontWeight: "500",
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="staff@cafeodoo.com"
                    style={{
                      background: "#F9FAFB",
                      border: "1px solid #e5e7eb",
                      color: "#111827",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      fontSize: "15px",
                      width: "100%",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    {...loginRegister("email")}
                  />
                  {loginErrors.email && (
                    <p
                      style={{
                        color: "#ef4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {loginErrors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "6px",
                      display: "block",
                      fontWeight: "500",
                    }}
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    style={{
                      background: "#F9FAFB",
                      border: "1px solid #e5e7eb",
                      color: "#111827",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      fontSize: "15px",
                      width: "100%",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    {...loginRegister("password")}
                  />
                  {loginErrors.password && (
                    <p
                      style={{
                        color: "#ef4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {loginErrors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: "8px",
                    background: loading ? "#9ca3af" : "#714B67",
                    color: "#fff",
                    padding: "14px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    width: "100%",
                    boxShadow: loading
                      ? "none"
                      : "0 4px 12px rgba(113, 75, 103, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              /* ── SIGNUP FORM ── */
              <form
                onSubmit={handleSignupSubmit(onSignup)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* Name */}
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "6px",
                      display: "block",
                      fontWeight: "500",
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    style={{
                      background: "#F9FAFB",
                      border: "1px solid #e5e7eb",
                      color: "#111827",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      fontSize: "15px",
                      width: "100%",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    {...signupRegister("name")}
                  />
                  {signupErrors.name && (
                    <p
                      style={{
                        color: "#ef4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {signupErrors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "6px",
                      display: "block",
                      fontWeight: "500",
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    style={{
                      background: "#F9FAFB",
                      border: "1px solid #e5e7eb",
                      color: "#111827",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      fontSize: "15px",
                      width: "100%",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    {...signupRegister("email")}
                  />
                  {signupErrors.email && (
                    <p
                      style={{
                        color: "#ef4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {signupErrors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "6px",
                      display: "block",
                      fontWeight: "500",
                    }}
                  >
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    style={{
                      background: "#F9FAFB",
                      border: "1px solid #e5e7eb",
                      color: "#111827",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      fontSize: "15px",
                      width: "100%",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    {...signupRegister("password")}
                  />
                  {signupErrors.password && (
                    <p
                      style={{
                        color: "#ef4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {signupErrors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  id="signup-submit"
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: "8px",
                    background: loading ? "#9ca3af" : "#714B67",
                    color: "#fff",
                    padding: "14px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    width: "100%",
                    boxShadow: loading
                      ? "none"
                      : "0 4px 12px rgba(113, 75, 103, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </form>
            )}
          </div>

          {/* Demo credentials — only show in login mode */}
          {mode === "login" && (
            <div
              style={{
                marginTop: "24px",
                padding: "20px",
                background: "#ffffff",
                borderRadius: "20px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  margin: "0 0 12px",
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                Quick Demo Login
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  {
                    role: "Admin",
                    email: "admin@cafeodoo.com",
                    pass: "admin123",
                  },
                  {
                    role: "Cashier",
                    email: "cashier@cafeodoo.com",
                    pass: "cashier123",
                  },
                  {
                    role: "Kitchen",
                    email: "kitchen@cafeodoo.com",
                    pass: "kitchen123",
                  },
                ].map((cred) => (
                  <button
                    key={cred.role}
                    type="button"
                    id={`demo-btn-${cred.role.toLowerCase()}`}
                    onClick={() => fillCredentials(cred.email, cred.pass)}
                    style={{
                      flex: 1,
                      padding: "10px 4px",
                      borderRadius: "10px",
                      background: "#ffffff",
                      border: "1px solid #d1d5db",
                      color: "#374151",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#F3F4F6";
                      e.currentTarget.style.borderColor = "#9ca3af";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                  >
                    {cred.role}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Image */}
      <div className="split-right" />
    </div>
  );
}
