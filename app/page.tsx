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
              Smart, fast,{" "}
              <span className={styles.underlineWrapper}>
                and economical!
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

      {/* ===== FEATURES SECTION ===== */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresInner}>
          <div className={styles.featuresHeader}>
            <h2 className={`${caveat.className} ${styles.featuresTitle}`}>
              Everything your café{" "}
              <span className={styles.featuresTitleHighlight}>
                <span className={styles.featuresTitleHighlightText}>needs</span>
                <svg
                  className={styles.featuresTitleHighlightSvg}
                  viewBox="0 0 200 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <ellipse
                    cx="100"
                    cy="50"
                    rx="90"
                    ry="42"
                    stroke="#6AD1C1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="4 6"
                    opacity="0.7"
                  />
                </svg>
              </span>
              ,<br />done right.
            </h2>
            <p className={styles.featuresSubtitle}>
              From the first QR scan to the final receipt — every touchpoint is
              connected in real-time. No plugins, no patchwork. One unified
              system.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {/* Card 1 — POS Terminal */}
            <div className={styles.featureCard}>
              <div className={styles.featureCardHeader}>
                <div
                  className={styles.featureCardIcon}
                  style={{ backgroundColor: "rgba(255,141,111,0.12)" }}
                >
                  <MonitorPlay size={22} color="#FF8D6F" />
                </div>
                <h3 className={styles.featureCardTitle}>
                  Point of Sale Terminal
                </h3>
              </div>
              <p className={styles.featureCardDesc}>
                A full cashier workstation with visual floor maps, interactive
                table selection, product search, cart management with promo
                codes, multi-payment processing, and instant receipt
                generation — printable or emailed directly to the customer.
              </p>
              <div className={styles.featureCardTags}>
                <span className={styles.featureCardTag}>Session Tracking</span>
                <span className={styles.featureCardTag}>Cash Variance</span>
                <span className={styles.featureCardTag}>Print / Email</span>
              </div>
            </div>

            {/* Card 2 — QR Self-Ordering */}
            <div className={styles.featureCard}>
              <div className={styles.featureCardHeader}>
                <div
                  className={styles.featureCardIcon}
                  style={{ backgroundColor: "rgba(106,209,193,0.12)" }}
                >
                  <CreditCard size={22} color="#6AD1C1" />
                </div>
                <h3 className={styles.featureCardTitle}>
                  QR Self-Ordering &amp; Payments
                </h3>
              </div>
              <p className={styles.featureCardDesc}>
                Customers scan a table QR code and get instant access to the
                full menu on their phone — no app download needed. They can add
                items, apply coupons, and pay online via Razorpay with secure
                HMAC-SHA256 backend verification.
              </p>
              <div className={styles.featureCardTags}>
                <span className={styles.featureCardTag}>Signed JWT QR</span>
                <span className={styles.featureCardTag}>Razorpay</span>
                <span className={styles.featureCardTag}>Live Tracking</span>
              </div>
            </div>

            {/* Card 3 — KDS */}
            <div className={styles.featureCard}>
              <div className={styles.featureCardHeader}>
                <div
                  className={styles.featureCardIcon}
                  style={{ backgroundColor: "rgba(76,165,255,0.12)" }}
                >
                  <ChefHat size={22} color="#4CA5FF" />
                </div>
                <h3 className={styles.featureCardTitle}>
                  Kitchen Display System
                </h3>
              </div>
              <p className={styles.featureCardDesc}>
                Orders push to the kitchen display in real-time via WebSockets.
                Kitchen staff can track and advance individual items through To
                Cook → Preparing → Completed stages with live elapsed timers and
                sound notifications.
              </p>
              <div className={styles.featureCardTags}>
                <span className={styles.featureCardTag}>Socket.IO</span>
                <span className={styles.featureCardTag}>Item-Level Tracking</span>
                <span className={styles.featureCardTag}>Sound Alerts</span>
              </div>
            </div>

            {/* Card 4 — Floor & Table Manager */}
            <div className={styles.featureCard}>
              <div className={styles.featureCardHeader}>
                <div
                  className={styles.featureCardIcon}
                  style={{ backgroundColor: "rgba(156,140,240,0.12)" }}
                >
                  <Store size={22} color="#9C8CF0" />
                </div>
                <h3 className={styles.featureCardTitle}>
                  Drag &amp; Drop Floor Manager
                </h3>
              </div>
              <p className={styles.featureCardDesc}>
                Design your café layout with a custom-built 2D grid editor.
                Drag tables onto floors, resize them, detect collisions, and
                generate signed QR codes — all without any third-party grid
                library. Pure HTML5 drag APIs.
              </p>
              <div className={styles.featureCardTags}>
                <span className={styles.featureCardTag}>Multi-Floor</span>
                <span className={styles.featureCardTag}>Collision Detection</span>
                <span className={styles.featureCardTag}>QR Generator</span>
              </div>
            </div>

            {/* Card 5 — Promotions */}
            <div className={styles.featureCard}>
              <div className={styles.featureCardHeader}>
                <div
                  className={styles.featureCardIcon}
                  style={{ backgroundColor: "rgba(255,184,51,0.12)" }}
                >
                  <PieChart size={22} color="#FFB833" />
                </div>
                <h3 className={styles.featureCardTitle}>
                  Promotions &amp; Reservations
                </h3>
              </div>
              <p className={styles.featureCardDesc}>
                Create percentage or flat-value coupons with minimum order
                rules, usage limits, expiration dates, and product-specific
                targeting. Plus a visual clock-picker reservation system for
                call-in bookings with table availability checks.
              </p>
              <div className={styles.featureCardTags}>
                <span className={styles.featureCardTag}>Auto-Apply</span>
                <span className={styles.featureCardTag}>Usage Gauges</span>
                <span className={styles.featureCardTag}>Clock Picker</span>
              </div>
            </div>

            {/* Card 6 — Analytics & Dashboard */}
            <div className={styles.featureCard}>
              <div className={styles.featureCardHeader}>
                <div
                  className={styles.featureCardIcon}
                  style={{ backgroundColor: "rgba(232,93,117,0.12)" }}
                >
                  <LayoutDashboard size={22} color="#E85D75" />
                </div>
                <h3 className={styles.featureCardTitle}>
                  Analytics &amp; Real-Time Dashboard
                </h3>
              </div>
              <p className={styles.featureCardDesc}>
                Revenue trend charts, category breakdowns, top-selling products,
                payment method distribution, and advanced multi-filter
                reports — all updating in real-time via WebSocket events. Export
                any report as CSV with one click.
              </p>
              <div className={styles.featureCardTags}>
                <span className={styles.featureCardTag}>Recharts</span>
                <span className={styles.featureCardTag}>CSV Export</span>
                <span className={styles.featureCardTag}>Live Updates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TECH STACK STRIP ===== */}
      <section className={styles.techStrip}>
        <div className={styles.techStripInner}>
          <p className={styles.techStripLabel}>Built with</p>
          <div className={styles.techLogos}>
            <span className={styles.techBadge}>
              <span className={styles.techDot} style={{ backgroundColor: "#61DAFB" }} />
              React 19
            </span>
            <span className={styles.techBadge}>
              <span className={styles.techDot} style={{ backgroundColor: "#000000" }} />
              Next.js 16
            </span>
            <span className={styles.techBadge}>
              <span className={styles.techDot} style={{ backgroundColor: "#336791" }} />
              PostgreSQL
            </span>
            <span className={styles.techBadge}>
              <span className={styles.techDot} style={{ backgroundColor: "#DC382D" }} />
              Redis
            </span>
            <span className={styles.techBadge}>
              <span className={styles.techDot} style={{ backgroundColor: "#010101" }} />
              Socket.IO
            </span>
            <span className={styles.techBadge}>
              <span className={styles.techDot} style={{ backgroundColor: "#2684FF" }} />
              Razorpay
            </span>
            <span className={styles.techBadge}>
              <span className={styles.techDot} style={{ backgroundColor: "#2D3748" }} />
              Prisma
            </span>
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
