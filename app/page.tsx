import Link from "next/link";
import {
  Store,
  MonitorPlay,
  ChefHat,
  Users,
  ShieldCheck,
  PieChart,
  CreditCard,
  LayoutDashboard,
} from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { Caveat } from "next/font/google";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import styles from "./page.module.css";

const caveat = Caveat({ subsets: ["latin"] });

export default async function HomePage() {
  // Removed port 3001 redirect to allow testing the landing page on localhost:3001

  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  return (
    <div className={styles.pageContainer}>
      <LandingNavbar
        staffSession={staffSession}
        customerSession={customerSession}
      />

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.blurBackground} />

        <div className={styles.heroContent}>
          <h1 className={`${caveat.className} ${styles.mainTitle}`}>
            All your cafe operations on <br />
            <span className={styles.highlightWrapper}>
              <span className={styles.highlightText}>one platform.</span>{" "}
              <div className="absolute inset-x-0 bottom-2 md:bottom-5 h-5 sm:h-8 md:h-14 bg-[#FDB833] -rotate-1 z-0 opacity-80 rounded-sm" />
              <svg
                className={styles.highlightBgSvg}
                preserveAspectRatio="none"
                viewBox="0 0 400 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19,41 C37,34 94,22 176,19 C257,15 330,16 358,17 C382,18 396,24 397,36 C398,47 377,59 342,66 C307,73 241,80 167,82 C93,85 41,83 18,74 C-4,65 -5,50 19,41 Z"
                  fill="#FDB833"
                />
                <path
                  d="M30,30 C80,20 180,15 280,18 C330,19 370,22 380,30 C390,38 370,45 320,50 C260,55 160,60 80,55 C30,50 20,40 30,30 Z"
                  fill="#FDB833"
                  opacity="0.8"
                />
              </svg>
            </span>
          </h1>

          <div className={styles.subTitleWrapper}>
            <p className={`${caveat.className} ${styles.subTitle}`}>
              Simple, efficient,{" "}
              <span className={styles.underlineWrapper}>
                yet affordable!
                <svg
                  className={styles.underlineSvg}
                  preserveAspectRatio="none"
                  viewBox="0 0 100 10"
                  fill="none"
                >
                  <path
                    d="M0 5C20 2 80 8 100 5"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </p>
          </div>

          <div className={styles.ctaButtons}>
            <Link href="/" className={styles.btnPrimary}>
              Start now - It&apos;s free
            </Link>
          </div>
        </div>

        {/* Curved bottom separator */}
        <div className={styles.curveContainer}>
          <svg
            className={styles.curveSvg}
            data-name="Layer 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,120 Q600,0 1200,120 L1200,120 L0,120 Z"
              className={styles.curvePath}
            ></path>
          </svg>
        </div>
      </section>

      {/* Odoo Icons Grid */}
      <section className={styles.iconsSection}>
        <div className={styles.iconsContainer}>
          <div className={styles.iconsGrid}>
            <AppIcon
              icon={<MonitorPlay size={32} color="#FF8D6F" />}
              label="Point of Sale"
            />
            <AppIcon
              icon={<ChefHat size={32} color="#6AD1C1" />}
              label="Kitchen (KDS)"
            />
            <AppIcon
              icon={<Users size={32} color="#4CA5FF" />}
              label="Customers"
            />
            <AppIcon
              icon={<Store size={32} color="#9C8CF0" />}
              label="Menu & Tables"
            />
            <AppIcon
              icon={<PieChart size={32} color="#FFB833" />}
              label="Analytics"
            />
            <AppIcon
              icon={<ShieldCheck size={32} color="#714B67" />}
              label="Admin"
            />
            <AppIcon
              icon={<CreditCard size={32} color="#E85D75" />}
              label="Payments"
            />
            <AppIcon
              icon={<LayoutDashboard size={32} color="#4CAF50" />}
              label="Dashboard"
            />
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © 2026 Odoo-Team75. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function AppIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className={styles.iconWrapper}>
      <div className={styles.iconBox}>{icon}</div>
      <span className={styles.iconLabel}>{label}</span>
    </div>
  );
}
