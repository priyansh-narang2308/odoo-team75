# Café Odoo — Actor Workflows

To master your hackathon pitch, you need to be able to explain the platform from the perspective of the **4 core actors**. Here is exactly how each person interacts with the system.

---

## 1. The Customer (Self-Service Flow)
The customer has a completely self-driven experience designed to reduce friction and waiting times.

**Workflow:**
1. **Onboarding:** The customer walks into the café and sits at Table 5.
2. **Scanning:** They scan the QR code glued to the table using their smartphone camera.
3. **Browsing:** The QR code routes them to `/order/[token]`, opening the digital menu on their phone.
4. **Ordering:** They add items to their cart (e.g., 2 Cappuccinos, 1 Croissant).
5. **Payment:** They checkout on their phone, paying via UPI (clicking "Open UPI App") or Card (Razorpay).
6. **Fulfillment:** Once paid, the order is automatically fired to the Kitchen Display. The customer just waits at their table until the waiter brings their food or their name is called.

---

## 2. The Cashier / Wait Staff (POS Flow)
The cashier handles walk-in customers, cash payments, and manual order entry.

**Workflow:**
1. **Session Start:** The cashier logs in at the front counter tablet (`/login`) and opens a "Session" with their opening cash float.
2. **Taking the Order:** A walk-in customer approaches the counter. The cashier uses the POS Terminal (`/pos`) to tap the items the customer dictates.
3. **Customer Assignment (Optional):** If the customer is a regular, the cashier clicks "Assign Customer" to attach the order to their profile for loyalty/receipts.
4. **Payment:** The cashier hits "Checkout". 
   - If the customer pays by **Cash**, the cashier enters the amount received and the system calculates the change.
   - If the customer pays by **UPI**, the cashier taps "UPI" and turns the tablet around so the customer can scan the POS QR code.
5. **Kitchen Handoff:** Once paid, the order automatically shifts to `SENT` status and appears in the kitchen. 
6. **Receipt:** The cashier clicks "Print" or enters the customer's email to send a digital receipt.

---

## 3. The Kitchen Staff (KDS Flow)
The chefs and baristas only care about making food fast. They don't handle money or menus.

**Workflow:**
1. **Receiving:** The kitchen staff watches the monitor (`/kds`). The moment an order is paid (by a customer at a table OR the cashier at the front), a new ticket pops up in real-time under the **"Pending"** column.
2. **Preparation:** The chef clicks the ticket to move it to **"Preparing"**.
3. **Item Striking:** As the chef finishes individual items (e.g., the coffee is done but the sandwich is still grilling), they click the item to cross it out.
4. **Completion:** Once everything is cooked, the chef moves the ticket to **"Completed"**. This can trigger a notification for the waiter to pick up the food and deliver it to the specific table.

---

## 4. The Admin / Manager (Back-office Flow)
The café owner/manager needs a bird's-eye view of the business and control over the configuration.

**Workflow:**
1. **Analytics:** The admin logs into `/admin` and views the Dashboard to see Live Revenue, Top Categories, and Top Orders for the day.
2. **Menu Management:** If a new seasonal drink is added, they go to **Menu** to instantly add the product, set its price, and create a new category.
3. **Floor Planning:** If the café moves tables around, the admin goes to **Tables & Floors** to drag-and-drop the visual floor map and generate new QR codes for the tables.
4. **Promotions:** The admin creates discount codes (e.g., `SUMMER20`) that customers and cashiers can apply at checkout.
5. **Reporting:** At the end of the week, the admin clicks **Export CSV** to send the sales data to their accountant.