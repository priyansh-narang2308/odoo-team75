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
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #0f0f13 0%, #1a1a24 50%, #0f0f13 100%)",
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
          background:
            "radial-gradient(circle, rgba(200, 121, 65, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          animation: "fadeIn 0.4s ease both",
        }}
        className="animate-fade-in"
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Image
              src="/CafePOS.png"
              alt="CafePOS Logo"
              width={90}
              height={90}
              style={{ objectFit: "contain" }}
            />
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
            Café Odoo POS
          </h1>
          <p style={{ color: "#8a8a9a", fontSize: "14px", margin: 0 }}>
            Staff Portal —{" "}
            {mode === "login" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {/* Login / Signup Toggle Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "16px",
            background: "rgba(26, 26, 36, 0.6)",
            borderRadius: "10px",
            padding: "4px",
            border: "1px solid rgba(42, 42, 58, 0.5)",
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
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background:
                  mode === tab ? "rgba(200, 121, 65, 0.15)" : "transparent",
                color: mode === tab ? "#c87941" : "#8a8a9a",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {tab === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "32px" }}>
          {mode === "login" ? (
            /* ── LOGIN FORM ── */
            <form
              onSubmit={handleLoginSubmit(onLogin)}
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Email */}
              <div>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="staff@cafeodoo.com"
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
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
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
                  background: loading
                    ? "#5a3a20"
                    : "linear-gradient(135deg, #c87941, #a06030)",
                  color: "#fff",
                  padding: "12px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "15px",
                  justifyContent: "center",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 16px rgba(200, 121, 65, 0.3)",
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
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Name */}
              <div>
                <label htmlFor="signup-name">Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Riya Sharma"
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
                <label htmlFor="signup-email">Email Address</label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
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
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
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
                  background: loading
                    ? "#5a3a20"
                    : "linear-gradient(135deg, #c87941, #a06030)",
                  color: "#fff",
                  padding: "12px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "15px",
                  justifyContent: "center",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 16px rgba(200, 121, 65, 0.3)",
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
              padding: "16px",
              background: "rgba(26, 26, 36, 0.6)",
              borderRadius: "12px",
              border: "1px solid rgba(42, 42, 58, 0.5)",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#8a8a9a",
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
                    padding: "8px 4px",
                    borderRadius: "8px",
                    border: "1px solid rgba(200, 121, 65, 0.2)",
                    background: "rgba(200, 121, 65, 0.08)",
                    color: "#c87941",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(200, 121, 65, 0.15)";
                    e.currentTarget.style.borderColor =
                      "rgba(200, 121, 65, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "rgba(200, 121, 65, 0.08)";
                    e.currentTarget.style.borderColor =
                      "rgba(200, 121, 65, 0.2)";
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
  );
}
