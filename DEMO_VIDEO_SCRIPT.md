# 🎬 The Purple Cup Café — Demo Video Script

> **Total Duration:** ~10 minutes  
> **Presenter Setup:** Two browser windows side by side (Staff Dashboard + Mobile/Customer view). A third tab ready for KDS.  
> **Tone:** Confident, conversational, professional — as if pitching to judges or investors.

---

## 🖥️ SETUP BEFORE RECORDING

1. **Browser Window 1** (Primary — Desktop): `http://localhost:3001` → Staff panel  
2. **Browser Window 2** (Secondary — Mobile emulation or phone): Customer QR order flow  
3. **Browser Tab 3** (Background): KDS Kitchen View  
4. **Pre-login credentials ready:**
   - Admin: `admin@cafeodoo.com` / `admin123`
   - Cashier: `cashier@cafeodoo.com` / `cashier123`
   - Kitchen: `kitchen@cafeodoo.com` / `kitchen123`
5. Make sure the database is seeded with mock data (420 products, 150 customers, 450 orders).
6. Keep a QR code PDF downloaded from the Tables page ready (or scan one from the app during demo).

---

## ACT 1 — THE HOOK *(0:00 – 0:45)*

### 🎯 Goal: Grab attention instantly. Explain what this is and why it matters.

**[SCREEN: Landing Page at `/`]**

> *"Meet The Purple Cup Café — a complete, real-time café management ecosystem. It's not just a Point of Sale. It's an entire operating system for running a modern café — from the moment a customer scans a QR code at their table, to the kitchen preparing their order, to the cashier completing the payment, and the admin analyzing revenue charts at the end of the day."*

> *"Built with React 19, Next.js 16, Socket.IO for real-time sync, PostgreSQL, Redis, Razorpay for payments, and Brevo for email receipts — this is a production-grade, full-stack application."*

**[ACTION]:** Hover over the Odoo-style icon grid at the bottom of the landing page to show the module ecosystem — Point of Sale, Kitchen (KDS), Customers, Menu & Tables, Analytics, Admin, Payments, Dashboard.

> *"Let's walk through every part of it."*

---

## ACT 2 — ADMIN PANEL & SETUP *(0:45 – 3:00)*

### 🎯 Goal: Show the admin backend — products, categories, tables, floors, QR codes, staff, promotions.

**[ACTION]:** Log in as Admin → `admin@cafeodoo.com` / `admin123`

---

### 📊 2A. Dashboard & Reports *(0:45 – 1:30)*

**[NAVIGATE: `/admin`]**

> *"The admin dashboard gives a bird's eye view of the entire operation."*

**[SHOW]:**
- **KPI Cards** at the top: Orders Today, Revenue Today, Active Tables, Avg. Order Value → Mention they are clickable, real-time (Socket.IO live badge).
- **Revenue Trend Chart** (Area Chart with gradient) → *"Revenue over the last 7 days, fully dynamic."*
- **Sales by Category** (Pie Chart) → *"Which menu categories are bringing in the most revenue."*
- **Top Products Table** → *"Most popular items by quantity sold."*
- **Top Orders Table** → *"Largest orders this period."*
- **Payment Breakdown** → *"Which payment methods customers prefer."*
- **Advanced Filters** → Select "Last 30 Days", filter by Employee, Session, or Product.
- **Export CSV** → Click to download the report data as a CSV file.

> *"All of this updates in real-time via WebSockets — no page refreshes needed."*

---

### 🍽️ 2B. Menu & Categories Manager *(1:30 – 2:00)*

**[NAVIGATE: `/admin/menu`]**

> *"This is where the menu is managed."*

**[SHOW]:**
- Browse the **product cards** — each with name, image matching, price, tax rate, and category badge.
- Click **Add Product** → Show the form with fields: Name, Price, Tax Rate, Category selector, Description, KDS toggle.
- Toggle **Availability** on a product → *"If a product runs out, one click disables it across the POS and customer menu."*

**[NAVIGATE: `/admin/categories`]**

> *"Categories have custom color tags — Coffee & Espresso, Cold Drinks, Desserts, and more."*

- Show **Add Category** → Name + Color picker.
- Show existing categories with color-coded badges.

---

### 🪑 2C. Drag-and-Drop Floor & Table Manager + QR Codes *(2:00 – 2:45)*

**[NAVIGATE: `/admin/tables`]**

> *"This is one of the most technically impressive features — a fully custom-built drag-and-drop floor plan editor."*

**[SHOW]:**
- **Multiple Floors** tab selector — Ground Floor, Rooftop.
- Click on a **floor tab** → Show the grid canvas with existing tables placed.
- **Drag a table template** (2-seat, 4-seat, 6-seat) from the sidebar onto the grid → *"Custom drag-and-drop using raw HTML5 APIs with collision detection and boundary checking."*
- **Resize a table** by dragging its corner handle → *"Tables can span multiple grid cells for larger groups."*
- **Click a table** → Show the edit panel: Table number, seats, status (Available/Occupied/Reserved).
- **Generate QR Code** → Click the QR button on any table → *"This generates a signed JWT token embedding the table ID — so the URL can't be spoofed."*
- **Download QR as image** or **Print QR** → *"You print these and place them on each physical table."*
- Show **expanded QR modal** with the table number label.

> *"No third-party grid libraries. Every pixel of collision detection, boundary checking, and sequential numbering is hand-coded."*

---

### 👥 2D. Staff Management *(2:45 – 3:00)*

**[NAVIGATE: `/admin/staff`]**

> *"Three roles: Admin, Cashier, Kitchen staff. Each with different access levels."*

- Show the staff list with role badges.
- Click **Add Staff** → Name, Email, Password, Role selector.
- *"Admins get the full dashboard. Cashiers access the POS terminal. Kitchen staff only see the KDS."*

---

## ACT 3 — THE POS TERMINAL *(3:00 – 5:00)*

### 🎯 Goal: Full cashier workflow — session management, table selection, order building, payment, receipt.

---

### 💼 3A. Session Management *(3:00 – 3:20)*

**[ACTION]:** Log out → Log in as Cashier → `cashier@cafeodoo.com` / `cashier123`

**[NAVIGATE: `/pos`]**

> *"Before taking orders, the cashier opens a session — entering their opening cash float."*

**[SHOW]:**
- **Last Closed Session** summary card (opening float, closing amount, date).
- Enter an **Opening Float** (e.g., ₹5,000) → Click **"Open Session & Launch Terminal"**
- → Redirected to the POS Terminal.

---

### 🗺️ 3B. Table Selection with Floor Plan *(3:20 – 3:45)*

**[SCREEN: POS Terminal at `/pos/terminal`]**

> *"The cashier selects a table from the visual floor plan."*

**[SHOW]:**
- Click **"Select Table"** → Shows the floor map modal with floor tabs.
- Tables are **color-coded**: Green = Available, Red = Occupied, Amber = Reserved.
- Each table shows **chair dots** around it proportional to seat count (2, 4, 6 configurations).
- Click a **green (available) table** → Table is selected, move to menu.
- Show the **context menu** on an occupied table → Options: "View Order", "Free Table".

> *"The same drag-and-drop layout from Admin — now rendered as a live interactive floor map."*

---

### 🛒 3C. Building an Order *(3:45 – 4:15)*

> *"Now let's build an order."*

**[SHOW]:**
- **Category tabs** at the top → Click "Coffee & Espresso", then "Desserts".
- **Search bar** → Type "Latte" → filtered results with product images.
- Click a product card → **Adds to cart** with animation.
- Click **+/−** on the cart item to adjust quantity.
- **Pagination** at the bottom → *"With 420 products loaded, pagination keeps it fast."*
- Show the **cart sidebar** with running Subtotal, Tax, and Grand Total.
- Click **Customer icon** → **Assign a customer** from the database or **Create New Customer** inline.
- Click **Promo Code icon** → Enter `WELCOME10` → *"10% discount auto-applied with validation."*
- Show **auto-detected promotions** banner → *"The system automatically suggests the best applicable offer."*

---

### 💳 3D. Payment & Receipt *(4:15 – 5:00)*

> *"Time to checkout."*

**[ACTION]:** Click **"Pay"** → Payment Dialog opens.

**[SHOW]:**
- **Payment Method selection**: Cash, UPI/QR, Credit/Debit Card.
- Select **Cash** → Enter amount tendered → Shows **change due**.
- Click **"Confirm Payment"** → Order is placed + payment recorded.

**[AFTER PAYMENT]:**
- **Receipt modal** appears → Shows order #, items, quantities, tax breakdown, discount line, grand total, payment method.
- **"Print Receipt"** button → Opens print dialog.
- **"Email Receipt"** button → Enter customer email → *"Sends a styled HTML receipt via Brevo SMTP."*

> *"The receipt is generated instantly. Print it or email it — the customer's choice."*

**[BRIEFLY MENTION]:**
- The **customer-facing display** (`/customer-display`) mirrors the cart in real-time via Socket.IO → *"A second screen at the counter shows customers what's being rung up, including the total and UPI QR during checkout."*

---

## ACT 4 — CUSTOMER QR SELF-ORDERING *(5:00 – 7:00)*

### 🎯 Goal: Show the full customer flow — scan QR, browse menu, add to cart, apply coupon, pay with Razorpay.

---

### 📱 4A. Scanning the QR Code *(5:00 – 5:15)*

**[ACTION]:** Switch to Mobile emulation (or actual phone). Scan the QR code or open the table URL directly.

> *"A customer sits down at their table, scans the QR code on the table tent, and immediately lands on the menu — no app download, no login hassle."*

**[SCREEN: `/order/[tableToken]`]**

- Shows table number and floor name at the top.
- *"The URL contains a signed JWT — it's cryptographically verified server-side to prevent spoofing."*

---

### 🍕 4B. Browsing & Adding Items *(5:15 – 5:45)*

**[SHOW]:**
- **Category chips** scrollable at the top → Tap "Coffee & Espresso".
- **Product cards** with images, names, prices.
- Tap a product → **Add to Cart** animation.
- Tap **+/−** to adjust quantity.
- Add **kitchen notes** to an item (e.g., "Extra hot, no sugar").
- Show the **floating cart button** with item count badge.
- Tap the cart → Slide-up **cart drawer** shows items, subtotal, tax, and grand total.

---

### 🏷️ 4C. Applying a Promo Code *(5:45 – 6:00)*

**[SHOW]:**
- Tap **"Have a promo code?"** toggle → Enters `FLAT50`.
- Shows validation → **"✅ Coupon applied! You save ₹50"**
- Grand total updates with discount line → *"Percentage and fixed-amount coupons both work, with min-order validation."*
- Auto-applied offers → *"If the system finds a better deal, it auto-applies it with a banner."*

---

### 💰 4D. Payment via Razorpay *(6:00 – 6:30)*

> *"The customer can pay right from their phone."*

**[ACTION]:** Tap **"Proceed to Pay"**

**[SHOW]:**
- **Payment Sheet** slides up → Order summary with tax, discount, and total.
- **Two payment tabs**: UPI QR Code | Razorpay Online.
- Select **Razorpay** → Tap **"Pay ₹XXX"** → Razorpay checkout popup opens.
- Select payment method (UPI / Card / Net Banking / Wallet).
- Complete payment → *"The backend verifies the payment signature using HMAC-SHA256 — no client-side forgery possible."*
- **Success screen** → Order placed confirmation with order number.

> *"The order immediately appears in the Kitchen Display System in real-time."*

---

### 📡 4E. Live Order Tracking *(6:30 – 7:00)*

**[SHOW]:**
- After placing the order, the customer stays on the page.
- **Order status tracker** shows each item with its KDS status:
  - 🔘 To Cook (gray)
  - 🔵 Preparing (blue)
  - 🟢 Completed (green)
- *"As the kitchen updates each item, the status changes here in real-time — no refreshing."*
- **"Request Bill"** button → *"One tap notifies the cashier that this table wants their check."*

---

## ACT 5 — KITCHEN DISPLAY SYSTEM (KDS) *(7:00 – 8:15)*

### 🎯 Goal: Show real-time kitchen workflow — tickets arriving, item-level status updates, completion.

**[ACTION]:** Open a new tab → Log in as Kitchen → `kitchen@cafeodoo.com` / `kitchen123`

**[NAVIGATE: `/kds`]**

> *"This is the kitchen's command center."*

---

### 🎫 5A. Live Ticket Board *(7:00 – 7:30)*

**[SHOW]:**
- **Ticket cards** displayed in a grid — each showing:
  - Order number badge
  - Table number
  - Source label (POS / CUSTOMER)
  - Elapsed time counter (ticking live)
  - List of items with individual status badges
- **Color coding**: Gray border = To Cook, Blue = Preparing, Green = Completed.
- *"New orders push in automatically via WebSocket — no page refresh needed."*
- **Sound notification** → Toggle the 🔔 speaker icon → *"An audible chime alerts when a new order lands."*

---

### 🔄 5B. Processing Orders *(7:30 – 8:00)*

**[SHOW]:**
- Click the **arrow button** on a single item → Status changes: To Cook → Preparing → Completed.
- Click **"Advance All"** on a ticket → All items in the ticket advance one step.
- *"The kitchen can update individual items or the entire ticket at once."*
- **Status filter tabs** at the top → Switch between "Active" (To Cook + Preparing) and "Completed".
- **Search bar** → Type an order number to find a specific ticket.

> *"When the last item on a ticket is marked Completed, the system broadcasts a notification to the cashier and the customer's phone."*

---

### 📡 5C. Real-Time Sync Demo *(8:00 – 8:15)*

**[SPLIT SCREEN: KDS + Customer phone side by side]**

- Mark an item as **Preparing** in the KDS → Watch the customer's order tracker update live → *"Preparing" badge appears.*
- Mark it as **Completed** → Customer sees 🟢 Completed.

> *"Zero latency. Socket.IO + Redis Pub/Sub ensures every screen in the system stays synchronized."*

---

## ACT 6 — PROMOTIONS & RESERVATIONS *(8:15 – 9:00)*

### 🎯 Goal: Show advanced features — coupon system and table reservations.

---

### 🏷️ 6A. Promotions Engine *(8:15 – 8:40)*

**[NAVIGATE: `/admin/promotions`]**

> *"A flexible coupon and promotions engine."*

**[SHOW]:**
- **Promotion cards** with:
  - Coupon code badge (e.g., `WELCOME10`)
  - Discount value (e.g., "10% OFF" or "₹50 OFF")
  - Min order amount badge
  - Usage progress bar (e.g., "Used: 12/100")
  - Expiry date
  - Active/Inactive toggle
- Click **New Promotion** → Show the creation form:
  - Code, Name, Type (Percentage / Fixed), Discount Value
  - Min Order Amount, Max Uses, Valid Until date
  - **Product-specific targeting** → Assign a promo to a specific product with min quantity
  - Active toggle
- *"Percentage or fixed, order-level or product-level, time-limited with usage caps — it covers every promotion scenario."*

---

### 📅 6B. Phone Reservations *(8:40 – 9:00)*

**[NAVIGATE: POS Terminal → Click "Reservations" tab in the bottom bar]**

> *"The cashier can book call-in reservations directly from the POS."*

**[SHOW]:**
- Click **"New Reservation"** → The booking form appears:
  - **Date picker** → Select today or a future date.
  - **Custom Clock picker** → Beautiful circular clock face UI (10 AM – 11:59 PM range).
  - **Seats selector** → Enter the guest count.
- Click **"Check Availability"** → System queries available tables.
- Shows **available tables** with floor name, table number, and seat count.
- Select a table → Enter **Customer Name** and **Phone**.
- Click **"Confirm Booking"** → Reservation created with success toast.
- Show the **Reservations list** with upcoming bookings, each with cancel button.

> *"The table's status automatically flips to Reserved (amber) on the floor map."*

---

## ACT 7 — TECHNICAL HIGHLIGHTS & CLOSING *(9:00 – 10:00)*

### 🎯 Goal: Highlight the engineering. Show the tech depth. Close strong.

---

### ⚡ 7A. Architecture Callouts *(9:00 – 9:30)*

> *"Let me highlight the engineering behind this."*

1. **Real-Time Architecture** → *"Socket.IO with Redis Pub/Sub adapter. Every order event, KDS update, and payment notification is broadcast across rooms in real-time. This scales horizontally — add more Node instances behind a load balancer and Redis keeps them synchronized."*

2. **Secure QR Tokens** → *"Table QR codes don't contain plain text IDs. They embed a signed JWT with the table and floor IDs, verified server-side with a secret. You can't forge a URL."*

3. **Payment Security** → *"Razorpay payments are never trusted from the client. The backend verifies every transaction with an HMAC-SHA256 signature before marking an order as paid."*

4. **Custom Drag-and-Drop** → *"The floor plan editor uses zero third-party grid libraries. Raw HTML5 drag APIs with custom collision detection, boundary checking, and dynamic resizing — all hand-coded."*

5. **Customer-Facing Display** → *"A dedicated screen (`/customer-display`) that mirrors the cashier's cart in real-time — showing items, totals, and a UPI QR code during checkout. Connected via Socket.IO."*

---

### 🏗️ 7B. Tech Stack Summary *(9:30 – 9:45)*

> *"The full stack:"*

| Layer | Technology |
|---|---|
| Frontend | React 19, Next.js 16 (App Router), Zustand |
| Styling | Tailwind CSS v4, Custom HSL tokens, Framer Motion |
| Backend | Custom Node.js server (server.ts), Next.js API Routes |
| Real-Time | Socket.IO + Redis Pub/Sub (`@socket.io/redis-adapter`) |
| Database | PostgreSQL + Prisma ORM (`@prisma/adapter-pg`) |
| Auth | NextAuth.js (Staff), Custom JWT (Customer QR) |
| Payments | Razorpay API (with HMAC-SHA256 verification) |
| Email | Brevo API (HTML receipt generation via SMTP) |
| Validation | Zod + React Hook Form |

---

### 🎤 7C. Closing Statement *(9:45 – 10:00)*

**[SCREEN: Landing page or Dashboard with revenue chart visible]**

> *"The Purple Cup Café isn't just a demo — it's a production-ready, real-time café management platform that handles every touchpoint of the café experience. From the admin setting up floors and menus, to the cashier processing payments, to the customer ordering from their phone, to the kitchen fulfilling orders — every piece talks to every other piece in real time."*

> *"Built by Team 75. Thank you."*

**[END — Fade to logo / team screen]**

---

## 📋 RECORDING TIPS

| Tip | Detail |
|---|---|
| **Screen resolution** | 1920×1080 or 2560×1440 for crisp text |
| **Browser zoom** | 100% for desktop, use Chrome DevTools mobile emulation for the customer flow |
| **Dark mode** | The app defaults to dark mode — it looks premium on camera. Use it. |
| **Mouse movements** | Slow, deliberate. Hover over elements to show tooltips and hover effects. |
| **Narration pace** | Slightly slower than conversational. Pause 1 second before switching sections. |
| **Background noise** | Record in a quiet room. Use a good microphone. |
| **Multiple tabs** | Pre-open all tabs before recording. Don't fumble with login screens on camera. |
| **Data** | Ensure the database has 420+ products, 150+ customers, and 450+ orders seeded for impressive-looking charts and tables. |
| **Split screen moment** | The KDS ↔ Customer real-time sync at 8:00 is the money shot. Practice this transition. |
| **Energy** | Start strong (the hook matters). Build excitement through the KDS demo. End confident. |

---

## ⏱️ TIMING BREAKDOWN

| Section | Start | End | Duration |
|---|---|---|---|
| **ACT 1** — The Hook | 0:00 | 0:45 | 45s |
| **ACT 2** — Admin Panel | 0:45 | 3:00 | 2m 15s |
| **ACT 3** — POS Terminal | 3:00 | 5:00 | 2m 00s |
| **ACT 4** — Customer QR Flow | 5:00 | 7:00 | 2m 00s |
| **ACT 5** — Kitchen Display (KDS) | 7:00 | 8:15 | 1m 15s |
| **ACT 6** — Promotions & Reservations | 8:15 | 9:00 | 45s |
| **ACT 7** — Tech & Closing | 9:00 | 10:00 | 1m 00s |
| **TOTAL** | | | **~10:00** |

---

## 🔑 KEY DEMO MOMENTS (Don't Skip These!)

1. ⭐ **Drag-and-drop a table onto the floor grid** (ACT 2C) — Most visually impressive admin feature.
2. ⭐ **QR Code generation and scanning** (ACT 2C → ACT 4A) — The bridge between admin and customer.
3. ⭐ **Building a full POS order with promo code** (ACT 3C) — Shows the cashier's daily workflow.
4. ⭐ **Razorpay payment on mobile** (ACT 4D) — Proves real payment integration works.
5. ⭐ **KDS ↔ Customer real-time sync split screen** (ACT 5C) — 🏆 **THE MONEY SHOT** — This single moment proves the Socket.IO architecture works end-to-end.
6. ⭐ **Revenue charts with real data** (ACT 2A) — Shows the analytics layer with 450+ orders.
7. ⭐ **Clock picker for reservations** (ACT 6B) — Beautiful custom UI component.

---

> **Final Note:** This script is designed to leave judges/viewers with the impression that this is not a hackathon prototype — it's a fully functional, production-grade application with deep technical engineering behind every feature. Every second of this demo should reinforce that message.
