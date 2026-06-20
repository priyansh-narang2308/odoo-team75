"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  LogOut,
  Users,
  UtensilsCrossed,
  Layers,
  Table2,
  Tag,
  Smile,
  CreditCard,
  Receipt,
  Menu,
  X,
} from "lucide-react";
import type { Role } from "@prisma/client";
import Image from "next/image";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface Props {
  userName: string;
  userRole: Role;
  userEmail: string;
}

const navItems = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pos", label: "POS Terminal", icon: ShoppingCart },
    { href: "/kds", label: "Kitchen Display", icon: ChefHat },
    { href: "/admin/menu", label: "Menu Management", icon: UtensilsCrossed },
    { href: "/admin/categories", label: "Categories", icon: Layers },
    { href: "/admin/tables", label: "Tables & Floors", icon: Table2 },
    { href: "/admin/staff", label: "Staff", icon: Users },
    { href: "/admin/customers", label: "Customers", icon: Smile },
    { href: "/admin/promotions", label: "Promotions", icon: Tag },
    { href: "/admin/orders", label: "Orders", icon: Receipt },
    {
      href: "/admin/payment-methods",
      label: "Payment Methods",
      icon: CreditCard,
    },
  ],
  CASHIER: [
    { href: "/pos", label: "POS Terminal", icon: ShoppingCart },
    { href: "/admin/orders", label: "Orders", icon: Receipt },
    { href: "/admin/customers", label: "Customers", icon: Smile },
  ],
  KITCHEN: [{ href: "/kds", label: "Kitchen Display", icon: ChefHat }],
};

const roleColors: Record<Role, string> = {
  ADMIN: "var(--color-primary)",
  CASHIER: "#3b82f6",
  KITCHEN: "#22c55e",
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  CASHIER: "Cashier",
  KITCHEN: "Kitchen",
};

export function StaffSidebar({ userName, userRole }: Props) {
  const pathname = usePathname();
  const items = navItems[userRole] || [];

  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <style>{`
        .mobile-header {
          display: none;
        }
        @media (max-width: 768px) {
          .staff-layout-wrapper {
            flex-direction: column !important;
          }
          .desktop-sidebar {
            position: fixed !important;
            top: 0;
            bottom: 0;
            left: -260px;
            width: 260px !important;
            min-width: 260px !important;
            transition: left 0.3s ease;
            z-index: 50;
            box-shadow: 4px 0 24px rgba(0,0,0,0.5);
          }
          .desktop-sidebar.open {
            left: 0;
          }
          .mobile-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            height: 60px;
            padding: 0 16px;
            background: var(--color-bg-elevated);
            border-bottom: 1px solid var(--color-border);
            z-index: 40;
            flex-shrink: 0;
          }
          .desktop-logo-area {
            display: none !important;
          }
        }
      `}</style>

      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setIsOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text)",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Menu size={24} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Image
              src="/CafePOS.png"
              alt="Logo"
              width={28}
              height={28}
              style={{ objectFit: "contain" }}
            />
            <span
              className="font-caveat gradient-text"
              style={{ fontSize: "22px", fontWeight: "700" }}
            >
              Café Odoo
            </span>
          </div>
        </div>
        <ThemeToggle sidebar={false} />
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 45,
          }}
        />
      )}

      <aside
        id="staff-sidebar"
        className={`desktop-sidebar ${isOpen ? "open" : ""}`}
        style={{
          width: "240px",
          minWidth: "240px",
          background: "var(--color-bg-elevated)",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
        }}
      >
        {/* Logo */}
        <div
          className="desktop-logo-area"
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--color-border-muted)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Image
                  src="/CafePOS.png"
                  alt="CafePOS Logo"
                  width={44}
                  height={44}
                  style={{ objectFit: "contain", height: "auto" }}
                />
              </div>
              <div>
                <div
                  className="font-caveat gradient-text"
                  style={{
                    fontWeight: "700",
                    fontSize: "22px",
                  }}
                >
                  Café Odoo
                </div>
                <div
                  style={{ fontSize: "11px", color: "var(--color-text-faint)" }}
                >
                  POS System
                </div>
              </div>
            </div>
            <div>
              <ThemeToggle sidebar={false} />
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : item.href === "/pos" || item.href === "/kds"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  marginBottom: "2px",
                  color: isActive
                    ? "var(--color-primary)"
                    : "var(--color-text-muted)",
                  background: isActive
                    ? "rgba(var(--color-primary-rgb), 0.12)"
                    : "transparent",
                  fontWeight: isActive ? "600" : "400",
                  fontSize: "14px",
                  transition: "all 0.15s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "var(--color-text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-text-muted)";
                  }
                }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid var(--color-border-muted)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: `${roleColors[userRole]}22`,
                border: `2px solid ${roleColors[userRole]}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "700",
                color: roleColors[userRole],
                flexShrink: 0,
              }}
            >
              {userName[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--color-text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: roleColors[userRole],
                  fontWeight: "500",
                }}
              >
                {roleLabels[userRole]}
              </div>
            </div>
          </div>

          <button
            id="logout-btn"
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              background: "transparent",
              color: "var(--color-text-muted)",
              fontSize: "13px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
