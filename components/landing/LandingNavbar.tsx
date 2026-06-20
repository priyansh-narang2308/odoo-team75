/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { LayoutDashboard, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import styles from "./LandingNavbar.module.css";
import { Caveat } from "next/font/google";

const caveat = Caveat({ subsets: ["latin"] });

export function LandingNavbar({
  staffSession,
  customerSession,
}: {
  staffSession: any;
  customerSession: any;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.leftSection}>
          <Link href="/" className={styles.logoLink}>
            <span
              className={`${styles.logoText} ${caveat.className} `}
              style={{ fontSize: "50px" }}
            >
              The Purple Cup Café
            </span>
          </Link>
        </div>

        <div className={styles.rightSection}>
          {staffSession || customerSession ? (
            <div className={styles.dashboardLinks}>
              {staffSession?.user?.role === "ADMIN" && (
                <Link href="/admin" className={styles.dashBtn}>
                  <LayoutDashboard size={16} /> Admin
                </Link>
              )}
              {staffSession?.user?.role === "KITCHEN" && (
                <Link href="/kds" className={styles.dashBtn}>
                  <LayoutDashboard size={16} /> Kitchen
                </Link>
              )}
              {staffSession?.user?.role === "CASHIER" && (
                <Link href="/pos" className={styles.dashBtn}>
                  <LayoutDashboard size={16} /> POS
                </Link>
              )}
              {customerSession && (
                <Link href="/customer/menu" className={styles.dashBtn}>
                  <LayoutDashboard size={16} /> Customer Menu
                </Link>
              )}
            </div>
          ) : (
            <div className={styles.loginActions}>
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={styles.dropdownBtn}
                >
                  Sign in
                  <ChevronDown size={16} />
                </button>

                {dropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    <Link
                      href="/customer/login"
                      className={`${styles.dropdownItem} ${styles.hasBorder}`}
                    >
                      Customer Portal
                    </Link>
                    <Link href="/login" className={styles.dropdownItem}>
                      Staff / Admin Portal
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
