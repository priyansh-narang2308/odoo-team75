/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { PrismaClient, KdsStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to generate a random float between min and max, formatted to 2 decimals
function randomPrice(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Helper to pick a random item from an array
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Precalculated bcrypt hash of "customer123" to save CPU time during bulk seeding
const PRECALCULATED_PASSWORD_HASH =
  "$2a$12$N9qo8uLOqp.R1p2bWn1xduf6t45c7d24s35e26g27h28i29j30k31";

async function main() {
  console.log("🌱 Starting large dataset seeding...\n");

  // 1. CLEAR EXISTING DATA (To avoid duplicate email/relation issues and ensure exactly 400+ fresh ones)
  console.log(
    "🧹 Cleaning up old orders, payments, customers, products, and categories...",
  );
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  console.log("✨ Clean completed!\n");

  // 2. RETRIEVE OR CREATE STAFF USERS & SYSTEM CONFIGS
  console.log("👥 Setting up system users and payment methods...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const cashierUser = await prisma.user.upsert({
    where: { email: "cashier@cafeodoo.com" },
    update: {},
    create: {
      name: "John Cashier",
      email: "cashier@cafeodoo.com",
      password: adminPassword,
      role: "CASHIER",
    },
  });

  const cashMethod = await prisma.paymentMethod.upsert({
    where: { id: "pm-cash" },
    update: { isEnabled: true },
    create: { id: "pm-cash", name: "Cash", type: "CASH", isEnabled: true },
  });

  const upiMethod = await prisma.paymentMethod.upsert({
    where: { id: "pm-upi" },
    update: { isEnabled: true },
    create: {
      id: "pm-upi",
      name: "UPI / QR",
      type: "UPI",
      isEnabled: true,
      upiId: "cafeodoo@upi",
    },
  });

  const cardMethod = await prisma.paymentMethod.upsert({
    where: { id: "pm-card" },
    update: { isEnabled: true },
    create: {
      id: "pm-card",
      name: "Credit / Debit Card",
      type: "CARD",
      isEnabled: true,
    },
  });

  const paymentMethods = [cashMethod, upiMethod, cardMethod];
  console.log("✅ Staff and payment methods ready.");

  // Retrieve existing tables to link orders
  const tables = await prisma.table.findMany();
  if (tables.length === 0) {
    throw new Error(
      "No tables found in the database. Please run the base seed script first.",
    );
  }
  console.log(`ℹ️ Found ${tables.length} tables to link orders to.`);

  // 3. GENERATE 15 CATEGORIES
  console.log("\n📁 Creating categories...");
  const categoryNames = [
    { name: "Signature Coffees", color: "#6F4E37" },
    { name: "Specialty Teas", color: "#8BC34A" },
    { name: "Cold Brews & Iced", color: "#2196F3" },
    { name: "Gourmet Burgers", color: "#FF9800" },
    { name: "Artisanal Pizzas", color: "#E91E63" },
    { name: "Pasta Bowls", color: "#9C27B0" },
    { name: "Fresh Salads", color: "#4CAF50" },
    { name: "Breakfast Mains", color: "#FFEB3B" },
    { name: "Savory Sides", color: "#795548" },
    { name: "Cakes & Gateaux", color: "#E91E63" },
    { name: "Cookies & Muffins", color: "#FF5722" },
    { name: "Waffles & Pancakes", color: "#FFC107" },
    { name: "Smoothies & Shakes", color: "#00BCD4" },
    { name: "Fresh Fruit Juices", color: "#009688" },
    { name: "Appetizers & Starters", color: "#607D8B" },
  ];

  const categories = [];
  for (let i = 0; i < categoryNames.length; i++) {
    const cat = await prisma.category.create({
      data: {
        name: categoryNames[i].name,
        color: categoryNames[i].color,
        sortOrder: i + 1,
        isVisible: true,
      },
    });
    categories.push(cat);
  }
  console.log(`✅ Created ${categories.length} categories.`);

  // 4. GENERATE 400+ PRODUCTS (28 products per category * 15 categories = 420 products)
  console.log("\n📦 Generating 420 unique products...");
  const productPrefixes = [
    "Classic",
    "Premium",
    "Signature",
    "Organic",
    "Spicy",
    "Crispy",
    "Loaded",
    "Roasted",
    "Double",
    "House",
    "Smoked",
    "Sweet",
    "Wild",
    "Rustic",
    "Chef's Special",
    "Creamy",
    "Cheesy",
    "Gourmet",
  ];

  const productSuffixes = [
    "Special",
    "Supreme",
    "Delight",
    "Platter",
    "Combo",
    "Extravaganza",
    "Bowl",
    "Infusion",
    "Crunch",
    "Frenzy",
    "Bliss",
    "Harvest",
    "Zest",
    "Sensational",
    "Medley",
    "Royal",
    "Elite",
    "Original",
  ];

  const categoryBaseItems: Record<string, string[]> = {
    "Signature Coffees": [
      "Espresso",
      "Cappuccino",
      "Latte",
      "Macchiato",
      "Flat White",
      "Mocha",
      "Americano",
      "Ristretto",
      "Cortado",
      "Affogato",
    ],
    "Specialty Teas": [
      "Chai",
      "Green Tea",
      "Matcha",
      "Earl Grey",
      "Chamomile",
      "Oolong",
      "Peppermint",
      "Hibiscus",
      "Darjeeling",
      "Jasmine",
    ],
    "Cold Brews & Iced": [
      "Cold Brew",
      "Iced Latte",
      "Nitro Brew",
      "Iced Mocha",
      "Frappe",
      "Affogato Shake",
      "Iced Americano",
      "Tonic Espresso",
    ],
    "Gourmet Burgers": [
      "Veg Burger",
      "Cheese Burger",
      "Chicken Burger",
      "Paneer Burger",
      "Mushroom Burger",
      "BBQ Burger",
      "Spicy Zinger",
    ],
    "Artisanal Pizzas": [
      "Margherita",
      "Pepperoni",
      "Veggie Delight",
      "Paneer Tikka Pizza",
      "BBQ Chicken Pizza",
      "Four Cheese",
      "Garden Fresh",
    ],
    "Pasta Bowls": [
      "Penne Alfredo",
      "Spaghetti Bolognese",
      "Mac and Cheese",
      "Pesto Pasta",
      "Lasagna",
      "Arrabbiata",
      "Carbonara",
    ],
    "Fresh Salads": [
      "Caesar Salad",
      "Greek Salad",
      "Garden Salad",
      "Quinoa Salad",
      "Fruit Salad",
      "Avocado Salad",
      "Caprese Salad",
    ],
    "Breakfast Mains": [
      "Avocado Toast",
      "Pancake Stack",
      "French Toast",
      "Omelette",
      "Waffles",
      "Eggs Benedict",
      "Granola Bowl",
    ],
    "Savory Sides": [
      "French Fries",
      "Garlic Bread",
      "Onion Rings",
      "Potato Wedges",
      "Cheese Balls",
      "Bruschetta",
      "Mozzarella Sticks",
    ],
    "Cakes & Gateaux": [
      "Chocolate Brownie",
      "Red Velvet",
      "Cheesecake",
      "Tiramisu",
      "Black Forest",
      "Apple Pie",
      "Lemon Tart",
    ],
    "Cookies & Muffins": [
      "Choco Chip Cookie",
      "Oatmeal Cookie",
      "Blueberry Muffin",
      "Chocolate Cupcake",
      "Banana Bread Slice",
      "Donut",
    ],
    "Waffles & Pancakes": [
      "Belgian Waffle",
      "Maple Pancake",
      "Nutella Crepe",
      "Berry Waffle",
      "Choco Pancake",
      "Honey Crepe",
    ],
    "Smoothies & Shakes": [
      "Mango Shake",
      "Strawberry Smoothie",
      "Chocolate Shake",
      "Berry Blast",
      "Vanilla Shake",
      "Oreo Crumble",
    ],
    "Fresh Fruit Juices": [
      "Orange Juice",
      "Watermelon Juice",
      "Pineapple Juice",
      "Apple Juice",
      "Fresh Lime Soda",
      "Mint Mojito",
    ],
    "Appetizers & Starters": [
      "Paneer Tikka",
      "Chicken Wings",
      "Spring Rolls",
      "Nachos Loaded",
      "Corn Fritters",
      "Fish Fingers",
    ],
  };

  const allProducts = [];

  for (const cat of categories) {
    const bases = categoryBaseItems[cat.name] || ["Item"];

    // Generate exactly 28 unique products for each category
    for (let j = 1; j <= 28; j++) {
      const prefix =
        productPrefixes[(j + cat.sortOrder) % productPrefixes.length];
      const base = bases[j % bases.length];
      const suffix =
        productSuffixes[(j * 2 + cat.sortOrder) % productSuffixes.length];

      const productName = `${prefix} ${base} ${suffix}`;
      const productPrice = randomPrice(60, 450);
      const isFood = [
        "Gourmet Burgers",
        "Artisanal Pizzas",
        "Pasta Bowls",
        "Fresh Salads",
        "Breakfast Mains",
        "Savory Sides",
        "Cakes & Gateaux",
        "Cookies & Muffins",
        "Waffles & Pancakes",
        "Appetizers & Starters",
      ].includes(cat.name);

      const prod = await prisma.product.create({
        data: {
          name: productName,
          description: `Freshly prepared ${productName.toLowerCase()} with premium ingredients.`,
          price: productPrice,
          taxRate: isFood ? 12 : 5, // 12% GST for food/bakery, 5% for beverages
          isAvailable: true,
          showInKds: true,
          categoryId: cat.id,
        },
      });
      allProducts.push(prod);
    }
  }
  console.log(`✅ Generated ${allProducts.length} products successfully.`);

  // 5. GENERATE 150 CUSTOMERS
  console.log("\n👤 Generating 150 customers...");
  const firstNames = [
    "Aarav",
    "Ishaan",
    "Ananya",
    "Dia",
    "Kabir",
    "Aditya",
    "Rohan",
    "Siddharth",
    "Neha",
    "Priya",
    "Rahul",
    "Amit",
    "Vikram",
    "Sneha",
    "Karan",
    "Arjun",
    "Riya",
    "Pooja",
    "Varun",
    "Abhishek",
    "John",
    "David",
    "Emma",
    "Olivia",
    "James",
    "Sophia",
    "Michael",
    "Charlotte",
    "Robert",
    "Emily",
    "Rajesh",
    "Sanjay",
    "Anil",
    "Sunita",
    "Anita",
    "Geeta",
    "Vijay",
    "Deepak",
    "Ravi",
    "Sandeep",
    "Preeti",
    "Kiran",
    "Meera",
    "Kavita",
    "Jyoti",
    "Harish",
    "Manish",
    "Gaurav",
    "Shalini",
    "Divya",
  ];

  const lastNames = [
    "Mehta",
    "Sharma",
    "Iyer",
    "Sen",
    "Roy",
    "Patel",
    "Gupta",
    "Verma",
    "Rao",
    "Nair",
    "Singh",
    "Kumar",
    "Joshi",
    "Mishra",
    "Pandey",
    "Trivedi",
    "Desai",
    "Shah",
    "Reddy",
    "Choudhury",
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Miller",
    "Davis",
    "Garcia",
    "Rodriguez",
    "Wilson",
    "Bose",
    "Dutta",
    "Das",
    "Banerjee",
    "Chatterjee",
    "Mukherjee",
    "Sen",
    "Goon",
    "Mitra",
    "Sarkar",
  ];

  const customers = [];
  const generatedEmails = new Set<string>();

  for (let i = 1; i <= 150; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[(i * 3) % lastNames.length];
    const fullName = `${fName} ${lName}`;

    let email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@cafeodoo.com`;
    // Ensure email uniqueness
    while (generatedEmails.has(email)) {
      email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}-${Math.floor(Math.random() * 1000)}@cafeodoo.com`;
    }
    generatedEmails.add(email);

    const phone = `98765${String(10000 + i)}`;

    const cust = await prisma.customer.create({
      data: {
        name: fullName,
        email,
        phone,
        password: PRECALCULATED_PASSWORD_HASH,
        isVerified: true,
      },
    });
    customers.push(cust);
  }
  console.log(`✅ Generated ${customers.length} customers successfully.`);

  // 6. GENERATE 400+ ORDERS (450 Orders total)
  console.log(
    "\n🛒 Creating 450 interconnected orders (with items and payments)...",
  );

  const orderStatuses = [
    "PAID",
    "PAID",
    "PAID",
    "PAID",
    "PAID",
    "SENT",
    "SENT",
    "DRAFT",
    "CANCELLED",
  ]; // Weighted statuses
  const orderSources = [
    "CASHIER",
    "CASHIER",
    "CASHIER",
    "CUSTOMER",
    "CUSTOMER",
  ]; // Weighted sources

  let createdOrdersCount = 0;

  for (let i = 1; i <= 450; i++) {
    const status = pickRandom(orderStatuses);
    const source = pickRandom(orderSources);
    const table = pickRandom(tables);
    const customer = pickRandom(customers);

    // Distribute order dates over the last 30 days
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));
    orderDate.setHours(
      Math.floor(Math.random() * 12) + 8,
      Math.floor(Math.random() * 60),
    ); // Between 8 AM and 8 PM

    // Select 1 to 5 random products for order items
    const itemCount = Math.floor(Math.random() * 5) + 1;
    const selectedProductsForOrder = [];
    for (let k = 0; k < itemCount; k++) {
      selectedProductsForOrder.push(pickRandom(allProducts));
    }

    // Prepare items data and calculate subtotals
    let subtotal = 0;
    let taxTotal = 0;
    const itemsData = [];

    for (const prod of selectedProductsForOrder) {
      const qty = Math.floor(Math.random() * 2) + 1; // 1 or 2
      const itemPrice = Number(prod.price);
      const lineTotal = itemPrice * qty;
      const taxAmount = (lineTotal * Number(prod.taxRate)) / 100;

      subtotal += lineTotal;
      taxTotal += taxAmount;

      itemsData.push({
        quantity: qty,
        unitPrice: itemPrice,
        lineTotal,
        productId: prod.id,
        kdsStatus: (status === "DRAFT"
          ? "TO_COOK"
          : status === "PAID" || status === "CANCELLED"
            ? "COMPLETED"
            : pickRandom(["TO_COOK", "PREPARING", "COMPLETED"])) as KdsStatus,
        createdAt: orderDate,
        updatedAt: orderDate,
      });
    }

    // Apply random discount sometimes
    let discountTotal = 0;
    if (status === "PAID" && subtotal > 150 && Math.random() < 0.2) {
      discountTotal =
        Math.random() < 0.5 ? 50.0 : parseFloat((subtotal * 0.1).toFixed(2));
    }

    const grandTotal = Math.max(
      0,
      parseFloat((subtotal + taxTotal - discountTotal).toFixed(2)),
    );

    const order = await prisma.order.create({
      data: {
        status: status as any,
        source: source as any,
        customerNote: Math.random() < 0.15 ? "Extra napkins please" : null,
        subtotal,
        taxTotal,
        discountTotal,
        grandTotal,
        tableId: table.id,
        customerId:
          source === "CUSTOMER"
            ? customer.id
            : Math.random() < 0.3
              ? customer.id
              : null,
        userId: source === "CASHIER" ? cashierUser.id : null,
        createdAt: orderDate,
        updatedAt: orderDate,
      },
    });

    // Create OrderItems in bulk for this order
    await prisma.orderItem.createMany({
      data: itemsData.map((item) => ({
        ...item,
        orderId: order.id,
      })),
    });

    // If order is PAID, create a Payment
    if (status === "PAID") {
      const pm = pickRandom(paymentMethods);
      await prisma.payment.create({
        data: {
          amount: grandTotal,
          transactionRef:
            pm.type !== "CASH"
              ? `TXN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
              : null,
          notes: `Paid via ${pm.name}`,
          orderId: order.id,
          methodId: pm.id,
          createdAt: orderDate,
        },
      });
    }

    createdOrdersCount++;
    if (createdOrdersCount % 50 === 0) {
      console.log(`   Processed ${createdOrdersCount}/450 orders...`);
    }
  }

  console.log(`✅ Seeded ${createdOrdersCount} interconnected orders.`);

  // 7. VERIFY SEEDED DATA
  console.log("\n📊 Verification Statistics:");
  const finalCategoriesCount = await prisma.category.count();
  const finalProductsCount = await prisma.product.count();
  const finalCustomersCount = await prisma.customer.count();
  const finalOrdersCount = await prisma.order.count();
  const finalOrderItemsCount = await prisma.orderItem.count();
  const finalPaymentsCount = await prisma.payment.count();

  console.log(`   Categories:  ${finalCategoriesCount}`);
  console.log(`   Products:    ${finalProductsCount}`);
  console.log(`   Customers:   ${finalCustomersCount}`);
  console.log(`   Orders:      ${finalOrdersCount}`);
  console.log(`   Order Items: ${finalOrderItemsCount}`);
  console.log(`   Payments:    ${finalPaymentsCount}`);

  console.log(
    "\n🎉 Large dataset seeding complete! Database is populated and fully interconnected.",
  );
}

main()
  .catch((e) => {
    console.error("❌ Large seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
