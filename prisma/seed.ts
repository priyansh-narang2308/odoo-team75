import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding CafePOS database...\n");

  // =====================
  // STAFF USERS
  // =====================
  const adminPassword = await bcrypt.hash("admin123", 12);
  const cashierPassword = await bcrypt.hash("cashier123", 12);
  const kitchenPassword = await bcrypt.hash("kitchen123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@cafeodoo.com" },
    update: {},
    create: {
      name: "Admin - Shivam",
      email: "admin@cafeodoo.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: "cashier@cafeodoo.com" },
    update: {},
    create: {
      name: "Priyansh Narang",
      email: "cashier@cafeodoo.com",
      password: cashierPassword,
      role: "CASHIER",
    },
  });

  const kitchen = await prisma.user.upsert({
    where: { email: "kitchen@cafeodoo.com" },
    update: {},
    create: {
      name: "Chef Kitchen - Kaushal",
      email: "kitchen@cafeodoo.com",
      password: kitchenPassword,
      role: "KITCHEN",
    },
  });

  console.log("Staff users created:");
  console.log(`   Admin: admin@cafeodoo.com / admin123`);
  console.log(`   Cashier: cashier@cafeodoo.com / cashier123`);
  console.log(`   Kitchen: kitchen@cafeodoo.com / kitchen123`);

  // =====================
  // FLOORS
  // =====================
  const groundFloor = await prisma.floor.upsert({
    where: { id: "floor-ground" },
    update: {},
    create: {
      id: "floor-ground",
      name: "Ground Floor",
      sortOrder: 1,
    },
  });

  const rooftop = await prisma.floor.upsert({
    where: { id: "floor-rooftop" },
    update: {},
    create: {
      id: "floor-rooftop",
      name: "Rooftop",
      sortOrder: 2,
    },
  });

  console.log("\nFloors created: Ground Floor, Rooftop");

  // =====================
  // TABLES
  // =====================
  const groundTables = [];
  for (let i = 1; i <= 8; i++) {
    const table = await prisma.table.upsert({
      where: {
        floorId_tableNumber: { floorId: groundFloor.id, tableNumber: `T${i}` },
      },
      update: {},
      create: {
        tableNumber: `T${i}`,
        seats: i <= 4 ? 2 : 4,
        floorId: groundFloor.id,
      },
    });
    groundTables.push(table);
  }

  const rooftopTables = [];
  for (let i = 1; i <= 6; i++) {
    const table = await prisma.table.upsert({
      where: {
        floorId_tableNumber: { floorId: rooftop.id, tableNumber: `R${i}` },
      },
      update: {},
      create: {
        tableNumber: `R${i}`,
        seats: 4,
        floorId: rooftop.id,
      },
    });
    rooftopTables.push(table);
  }

  console.log(
    `Tables created: ${groundTables.length} on Ground Floor, ${rooftopTables.length} on Rooftop`,
  );

  // =====================
  // CATEGORIES
  // =====================
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "Coffee & Espresso" },
      update: {},
      create: { name: "Coffee & Espresso", color: "#6F4E37", sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { name: "Cold Drinks" },
      update: {},
      create: { name: "Cold Drinks", color: "#2196F3", sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { name: "Teas & Infusions" },
      update: {},
      create: { name: "Teas & Infusions", color: "#8BC34A", sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { name: "Snacks & Bites" },
      update: {},
      create: { name: "Snacks & Bites", color: "#FF9800", sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { name: "Desserts" },
      update: {},
      create: { name: "Desserts", color: "#E91E63", sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { name: "Add-ons" },
      update: {},
      create: { name: "Add-ons", color: "#9E9E9E", sortOrder: 6 },
    }),
  ]);

  const [coffee, coldDrinks, teas, snacks, desserts, addons] = categories;
  console.log(
    "\nCategories created:",
    categories.map((c) => c.name).join(", "),
  );

  // =====================
  // PRODUCTS
  // =====================
  const products = [
    // Coffee
    {
      name: "Espresso",
      description: "Pure, intense single shot",
      price: 80,
      taxRate: 5,
      categoryId: coffee.id,
    },
    {
      name: "Double Espresso",
      description: "Rich double shot",
      price: 120,
      taxRate: 5,
      categoryId: coffee.id,
    },
    {
      name: "Cappuccino",
      description: "Espresso with steamed milk and foam",
      price: 150,
      taxRate: 5,
      categoryId: coffee.id,
    },
    {
      name: "Latte Small",
      description: "Smooth espresso with steamed milk (250ml)",
      price: 160,
      taxRate: 5,
      categoryId: coffee.id,
    },
    {
      name: "Latte Large",
      description: "Smooth espresso with steamed milk (400ml)",
      price: 200,
      taxRate: 5,
      categoryId: coffee.id,
    },
    {
      name: "Flat White",
      description: "Double ristretto with micro-foam",
      price: 180,
      taxRate: 5,
      categoryId: coffee.id,
    },
    {
      name: "Americano",
      description: "Espresso with hot water",
      price: 110,
      taxRate: 5,
      categoryId: coffee.id,
    },
    {
      name: "Mocha",
      description: "Espresso with chocolate and steamed milk",
      price: 190,
      taxRate: 5,
      categoryId: coffee.id,
    },

    // Cold Drinks
    {
      name: "Cold Brew",
      description: "Slow-steeped for 12 hours, served over ice",
      price: 220,
      taxRate: 5,
      categoryId: coldDrinks.id,
    },
    {
      name: "Iced Latte",
      description: "Espresso with cold milk over ice",
      price: 180,
      taxRate: 5,
      categoryId: coldDrinks.id,
    },
    {
      name: "Frappe",
      description: "Blended iced coffee",
      price: 200,
      taxRate: 5,
      categoryId: coldDrinks.id,
    },
    {
      name: "Fresh Lime Soda",
      description: "Freshly squeezed lime with soda",
      price: 120,
      taxRate: 5,
      categoryId: coldDrinks.id,
    },

    // Teas
    {
      name: "Masala Chai",
      description: "Traditional spiced milk tea",
      price: 80,
      taxRate: 5,
      categoryId: teas.id,
    },
    {
      name: "Green Tea",
      description: "Premium loose-leaf green tea",
      price: 100,
      taxRate: 5,
      categoryId: teas.id,
    },
    {
      name: "Earl Grey",
      description: "Classic bergamot-scented black tea",
      price: 120,
      taxRate: 5,
      categoryId: teas.id,
    },
    {
      name: "Chamomile",
      description: "Soothing floral herbal tea",
      price: 110,
      taxRate: 5,
      categoryId: teas.id,
    },

    // Snacks
    {
      name: "Croissant",
      description: "Buttery, flaky baked fresh daily",
      price: 120,
      taxRate: 12,
      categoryId: snacks.id,
      showInKds: false,
    },
    {
      name: "Avocado Toast",
      description: "Sourdough with smashed avocado and seasoning",
      price: 280,
      taxRate: 12,
      categoryId: snacks.id,
    },
    {
      name: "Chicken Sandwich",
      description: "Grilled chicken with lettuce and mayo",
      price: 320,
      taxRate: 12,
      categoryId: snacks.id,
    },
    {
      name: "Veg Sandwich",
      description: "Fresh veggies with hummus on whole wheat",
      price: 240,
      taxRate: 12,
      categoryId: snacks.id,
    },
    {
      name: "Paneer Tikka",
      description: "Spiced cottage cheese, char-grilled",
      price: 280,
      taxRate: 12,
      categoryId: snacks.id,
    },

    // Desserts
    {
      name: "Chocolate Brownie",
      description: "Warm fudgy brownie with vanilla ice cream",
      price: 180,
      taxRate: 12,
      categoryId: desserts.id,
      showInKds: false,
    },
    {
      name: "Cheesecake",
      description: "New York style with berry coulis",
      price: 220,
      taxRate: 12,
      categoryId: desserts.id,
      showInKds: false,
    },
    {
      name: "Tiramisu",
      description: "Classic Italian with espresso and mascarpone",
      price: 240,
      taxRate: 12,
      categoryId: desserts.id,
      showInKds: false,
    },

    // Add-ons
    {
      name: "Extra Shot",
      description: "Add an extra espresso shot",
      price: 40,
      taxRate: 5,
      categoryId: addons.id,
      showInKds: false,
    },
    {
      name: "Oat Milk",
      description: "Plant-based oat milk substitute",
      price: 50,
      taxRate: 5,
      categoryId: addons.id,
      showInKds: false,
    },
    {
      name: "Almond Milk",
      description: "Plant-based almond milk substitute",
      price: 50,
      taxRate: 5,
      categoryId: addons.id,
      showInKds: false,
    },
    {
      name: "Whipped Cream",
      description: "Extra whipped cream topping",
      price: 30,
      taxRate: 5,
      categoryId: addons.id,
      showInKds: false,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: `prod-${product.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `prod-${product.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: product.name,
        description: product.description,
        price: product.price,
        taxRate: product.taxRate,
        isAvailable: true,
        showInKds: product.showInKds !== false,
        categoryId: product.categoryId,
      },
    });
  }

  console.log(`\n${products.length} products created`);

  // =====================
  // PAYMENT METHODS
  // =====================
  await prisma.paymentMethod.upsert({
    where: { id: "pm-cash" },
    update: {},
    create: {
      id: "pm-cash",
      name: "Cash",
      type: "CASH",
      isEnabled: true,
    },
  });

  await prisma.paymentMethod.upsert({
    where: { id: "pm-upi" },
    update: {},
    create: {
      id: "pm-upi",
      name: "UPI / QR",
      type: "UPI",
      isEnabled: true,
      upiId: "priyanshnarang23@okhdfc",
    },
  });

  await prisma.paymentMethod.upsert({
    where: { id: "pm-card" },
    update: {},
    create: {
      id: "pm-card",
      name: "Credit / Debit Card",
      type: "CARD",
      isEnabled: true,
    },
  });

  console.log("\nPayment methods: Cash, UPI / QR, Credit/Debit Card");

  // =====================
  // SAMPLE PROMOTIONS
  // =====================
  await prisma.promotion.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      name: "Welcome Discount",
      code: "WELCOME10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderAmount: 200,
      isActive: true,
    },
  });

  await prisma.promotion.upsert({
    where: { code: "FLAT50" },
    update: {},
    create: {
      name: "Flat ₹50 Off",
      code: "FLAT50",
      discountType: "FIXED",
      discountValue: 50,
      minOrderAmount: 300,
      isActive: true,
    },
  });

  console.log("\nPromotions: WELCOME10 (10% off), FLAT50 (₹50 off)");

  // =====================
  // CUSTOMERS
  // =====================
  const customerPassword = await bcrypt.hash("customer123", 12);
  const sampleCustomers = [
    {
      id: "cust-1",
      name: "Aarav Mehta",
      email: "aarav@gmail.com",
      phone: "9876543210",
    },
    {
      id: "cust-2",
      name: "Ishaan Sharma",
      email: "ishaan@gmail.com",
      phone: "9876543211",
    },
    {
      id: "cust-3",
      name: "Ananya Iyer",
      email: "ananya@gmail.com",
      phone: "9876543212",
    },
    {
      id: "cust-4",
      name: "Dia Sen",
      email: "dia@gmail.com",
      phone: "9876543213",
    },
    {
      id: "cust-5",
      name: "Kabir Roy",
      email: "kabir@gmail.com",
      phone: "9876543214",
    },
  ];

  for (const cust of sampleCustomers) {
    await prisma.customer.upsert({
      where: { email: cust.email },
      update: {},
      create: {
        id: cust.id,
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        password: customerPassword,
        isVerified: true,
      },
    });
  }
  console.log(`Customers created: ${sampleCustomers.length} sample customers`);

  console.log("\nSeed complete! CafePOS is ready.\n");
  console.log("Login credentials:");
  console.log("   Admin:   admin@cafeodoo.com    / admin123");
  console.log("   Cashier: cashier@cafeodoo.com  / cashier123");
  console.log("   Kitchen: kitchen@cafeodoo.com  / kitchen123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
