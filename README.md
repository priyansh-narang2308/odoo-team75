# Café (CafePOS)

A dark-first, premium café management ecosystem and Point-of-Sale (POS) application built with React, Next.js, and Socket.IO. The platform features real-time ordering sync, drag-and-drop floor plan editing, a Kitchen Display System (KDS), promotional tools, and online customer payments.

---

## Tech Stack

### Frontend

- **Core Framework:** React 19, Next.js 16 (App Router)
- **State Management:** Zustand (lightweight, client-side store)
- **Styling & Theme:** Tailwind CSS v4, custom HSL design tokens, dark-first premium café design (Espresso, Caramel, Cream, Roast tones) with high-contrast light mode support
- **Animations:** Framer Motion (for modal sweeps, slide-in sidebar menus, and micro-interactions)
- **Form & Validation:** React Hook Form + Resolver + Zod
- **Icons:** Lucide React

### Backend & Real-time

- **Core Server:** Custom Node.js HTTP server mapping Next.js request handlers and a Socket.IO connection manager
- **Real-time Communication:** Socket.IO with multi-channel namespaces
- **Caching & Pub/Sub:** Redis (`ioredis` client) for scaling socket events and local session configurations
- **Database & ORM:** PostgreSQL managed with Prisma ORM, utilizing pooled database connections (`@prisma/adapter-pg`)
- **Security & Auth:** NextAuth.js (Staff Auth), custom JWT table tokens (Customer QR verification)

### External Integrations

- **Payments:** Razorpay API (Secure online payment popup and backend signature verification webhook)
- **Emails:** Brevo API (SMTP mailer for generating and sending structured HTML receipts to customers)

---

## Features

### Drag-and-Drop Floor & Table Layout Manager

- **Multi-Floor Support:** Manage different dining spaces like the Ground Floor, Rooftop, or Patio.
- **Canvas Layout Grid:** Drag template shapes (2-Person, 4-Person, 6-Person configurations) onto a Snapping 2D Grid.
- **Collision Detection:** Interactive placement logic checks boundaries and overlaps before saving coordinates to the PostgreSQL database.
- **Dynamic Canvas Resizing:** Grab and drag a scale handle on any table's corner to resize its grid column/row footprint.
- **Sequential Table Numbering:** Auto-generates table designations (e.g. `T1`, `T2`, etc.) sequentially.
- **QR Code Generator:** Signs a JWT for table IDs and converts the route link to downloadable QR codes for guest self-ordering.

### Cashier POS Terminal

- **Interactive Floor Maps:** Color-coded tables indicate whether they are _Available (Green)_, _Occupied (Red)_, or _Reserved (Amber)_.
- **Dynamic Ticket Drafting:** Build customer checkouts, choose custom notes per item, and select payment types.
- **Staff Session Tracker:** Keep track of drawers, inputting opening cash and finalizing closing drawer figures.
- **Instant Invoices:** Receipt generation with immediate option to print or email directly to the customer.

### Customer QR Self-Ordering Portal

- **Table Scans:** Scan a table QR, sign in, and access the menu on a mobile-responsive interface.
- **Real-time Cart Management:** Add items, view running taxes, apply promo codes, and customize kitchen notes.
- **Razorpay Checkout:** Pay online using Net Banking, UPI, Cards, or digital wallets.
- **Paging Services:** Request the bill with a dedicated button that immediately notifies the cashier's station.

### Kitchen Display System (KDS)

- **Live Ticket Board:** New customer orders automatically push into the kitchen monitor without page refreshes.
- **Granular Item Tracking:** Transition items individually or as entire tickets through processing phases (_Pending_ ➔ _Preparing_ ➔ _Ready_ ➔ _Done_).
- **Cashier Notification:** Triggers real-time alerts to the cashier and customer once orders are cooked and ready.

### Promotions & Coupon System

- **Flex Discount Rules:** Generate coupons supporting Percentage discounts (`% OFF`) or Fixed Price discounts (`₹ OFF`).
- **Advanced Rulesets:** Set coupon minimum order values, active time ranges, and total usage limits.
- **Progress Gauges:** Visually track coupon consumption rates.

### Admin Panel & Analytics

- **Insights Center:** Bar charts and statistics displaying revenue counts, popular items, transactional volume, and active cashier logs.
- **Menus & Categories:** Create product categories with custom tags, assign product images, set tax rates, and route specific foods to the KDS.
- **Staff Directory:** Manage roles (ADMIN, CASHIER, KITCHEN) and register new credentials.

---

## Challenging Tech Highlights

### 1. Real-Time Event Syncing (Socket.IO + Redis Pub/Sub)

All key order updates are broadcasted through a custom Socket.IO layer in `server.ts`.
To facilitate scale, we utilize `@socket.io/redis-adapter` over an `ioredis` connection. This allows horizontal scaling of Node instances behind a load balancer; socket events published on instance A are synchronized through Redis and pushed out to clients connected on instance B.

```ts
// server.ts
io.on("connection", (socket) => {
  // Joined rooms align events to target listeners
  socket.on(SOCKET_EVENTS.JOIN_TABLE, (tableId) =>
    socket.join(`table:${tableId}`),
  );
  socket.on(SOCKET_EVENTS.JOIN_KITCHEN, () => socket.join("kitchen"));
  socket.on(SOCKET_EVENTS.JOIN_CASHIER, () => socket.join("cashier"));
});
```

### 2. Custom 2D Grid Drag-and-Drop + Resizer

Instead of using heavy grid layout packages, the layout canvas is built from raw HTML5 drag APIs and custom mouse event listeners. A bounds and overlap checking algorithm validates layouts in real-time, preventing visual clipping:

```ts
const checkCollision = (tableId, x, y, w, h, floorId) => {
  // Boundary constraints check
  if (x < 0 || y < 0 || x + w > floor.gridWidth || y + h > floor.gridHeight)
    return true;
  // Overlap verification
  return tables.some(
    (t) =>
      t.id !== tableId &&
      x < t.x + t.width &&
      x + w > t.x &&
      y < t.y + t.height &&
      y + h > t.y,
  );
};
```

### 3. Secure QR Tokens via Custom JWTs

To prevent malicious customers from ordering items from random table numbers or forging checkout links, the table QR code does not contain clear-text identifiers. Instead, table URLs embed a signed JWT containing the table ID and floor ID. The customer portal decodes and verifies this token on load:

- **Route Format:** `/order/[token]`
- **Validation:** Verified using a server-side `QR_SECRET` signature, ensuring only physical table QR code printouts are valid ordering targets.

### 4. Secure Payment Hook Verification

To avoid client-side payment forgery, the transaction status is never accepted from the frontend. Instead, once Razorpay completes a transaction, it triggers a backend verification API that computes an HMAC-SHA256 signature using the `RAZORPAY_KEY_SECRET` before marking the order as `PAID` in the database.

---

## How to Run and Use

### Prerequisites

- **Node.js** (v18 or higher)
- **Docker** (optional, for running Postgres & Redis)
- **npm** or **pnpm**

---

### 1. Set Up Services (PostgreSQL & Redis)

If you have Docker installed, you can spin up both database and Redis instances using the included `docker-compose.yml`:

```bash
docker compose up -d
```

This spins up:

- **PostgreSQL** on port `5432` (User: `postgres`, Password: `mysecretpassword`, Database: `cafepos`)
- **Redis** on port `6379`

---

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database Settings
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/cafepos?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Web URL Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
PORT=3001

# Authentication Secrets
NEXTAUTH_SECRET="your-next-auth-session-secret-key"
CUSTOMER_JWT_SECRET="your-customer-jwt-key"
QR_SECRET="your-table-qr-jwt-signing-secret"

# Razorpay credentials
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your-razorpay-secret-key"
RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"

# Brevo (Sendinblue) Email SMTP
BREVO_API_KEY="xkeysib-..."
SMTP_FROM_EMAIL="receipt@cafeodoo.com"
EMAIL_FROM_NAME="The Purple Cup Cafe"
```

---

### 3. Initialize the Database

Install dependencies and run Prisma migrations to build your tables and seed default database values (including admin, cashier, kitchen accounts, and dummy menu items):

```bash
# Install npm dependencies
npm install

# Apply database migrations
npm run db:migrate

# Seed menu items and accounts
npm run db:seed
```

#### Default Seed Credentials

You can log in to the POS/Admin dashboard with the following accounts:

- **Admin:** `admin@cafeodoo.com` / `admin123`
- **Cashier:** `cashier@cafeodoo.com` / `cashier123`
- **Kitchen:** `kitchen@cafeodoo.com` / `kitchen123`

---

### 4. Launch the Server

To support **WebSockets**, launch the custom server `server.ts` instead of standard Next dev:

```bash
npm run start
```

- Access the portal at [http://localhost:3001](http://localhost:3001)
- Open Prisma Studio to manage database rows: `npm run db:studio`
