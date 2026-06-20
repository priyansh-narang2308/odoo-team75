import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, format, startOfWeek, startOfMonth } from "date-fns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7d";
  const customStart = searchParams.get("startDate");
  const customEnd = searchParams.get("endDate");
  const employeeId = searchParams.get("employeeId");
  const sessionId = searchParams.get("sessionId");
  const productId = searchParams.get("productId");

  let startDate: Date;
  let endDate: Date = endOfDay(new Date());

  if (period === "custom" && customStart && customEnd) {
    startDate = startOfDay(new Date(customStart));
    endDate = endOfDay(new Date(customEnd));
  } else if (period === "today") {
    startDate = startOfDay(new Date());
  } else if (period === "this_week") {
    startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  } else if (period === "this_month") {
    startDate = startOfMonth(new Date());
  } else {
    const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
    startDate = startOfDay(subDays(new Date(), days - 1));
  }

  // Base query conditions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderWhere: any = {
    status: "PAID",
    createdAt: { gte: startDate, lte: endDate },
  };

  if (employeeId) {
    orderWhere.userId = employeeId;
  }
  if (sessionId) {
    orderWhere.sessionId = sessionId;
  }
  if (productId) {
    orderWhere.items = { some: { productId } };
  }

  // Active tables don't need all filters, just a count
  const activeTablesPromise = prisma.table.count({
    where: {
      orders: { some: { status: { in: ["DRAFT", "SENT"] } } },
    },
  });

  const [
    totalOrdersToday,
    totalRevenueTodayAgg,
    activeTablesCount,
    paidOrders,
    topProductsAgg,
    revenueByDayQuery,
    paymentMethodBreakdown,
    topOrdersRaw,
  ] = await Promise.all([
    // Today's order count (filtered by employee/session if applicable)
    prisma.order.count({
      where: {
        ...orderWhere,
        createdAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
    }),

    // Today's revenue
    prisma.order.aggregate({
      where: {
        ...orderWhere,
        createdAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
      _sum: { grandTotal: true },
    }),

    activeTablesPromise,

    // All paid orders in period
    prisma.order.findMany({
      where: orderWhere,
      include: {
        payments: { include: { method: { select: { type: true, name: true } } } },
        items: { include: { product: { select: { name: true, categoryId: true, category: { select: { name: true, color: true } } } } } },
      },
    }),

    // Top selling products (requires items where order matches)
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: orderWhere,
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),

    // Revenue by day (last N days or custom)
    prisma.order.findMany({
      where: orderWhere,
      select: { grandTotal: true, createdAt: true },
    }),

    // Payment method breakdown
    prisma.payment.groupBy({
      by: ["methodId"],
      where: {
        order: orderWhere,
      },
      _sum: { amount: true },
      _count: true,
    }),

    // Top Orders
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { grandTotal: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
        customer: { select: { name: true } },
      }
    }),
  ]);

  // Process top products (get names)
  const productIds = topProductsAgg.map((p) => p.productId);
  const productNames = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });

  const topProducts = topProductsAgg.map((p) => ({
    productId: p.productId,
    name: productNames.find((n) => n.id === p.productId)?.name || "Unknown",
    totalQty: p._sum.quantity || 0,
    totalRevenue: Number(p._sum.lineTotal || 0),
  }));

  // Process Top Categories
  const categoryMap: Record<string, { id: string, name: string, color: string, totalQty: number, totalRevenue: number }> = {};
  
  paidOrders.forEach(order => {
    order.items.forEach(item => {
      const cat = item.product?.category;
      if (cat) {
        if (!categoryMap[item.product.categoryId!]) {
          categoryMap[item.product.categoryId!] = {
            id: item.product.categoryId!,
            name: cat.name,
            color: cat.color || "#ccc",
            totalQty: 0,
            totalRevenue: 0,
          };
        }
        categoryMap[item.product.categoryId!].totalQty += item.quantity;
        categoryMap[item.product.categoryId!].totalRevenue += Number(item.lineTotal);
      }
    });
  });

  const topCategories = Object.values(categoryMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Process revenue by day
  const dayMap: Record<string, number> = {};
  
  // If period is custom or this_month etc, we just group by the actual days we have, or generate the sequence.
  // For simplicity, just populate the days that have revenue, and sort them.
  revenueByDayQuery.forEach((o) => {
    const day = format(o.createdAt, "yyyy-MM-dd");
    dayMap[day] = (dayMap[day] || 0) + Number(o.grandTotal);
  });

  const revenueChart = Object.entries(dayMap)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically

  // Process payment methods
  const methodIds = paymentMethodBreakdown.map((p) => p.methodId);
  const methods = await prisma.paymentMethod.findMany({
    where: { id: { in: methodIds } },
    select: { id: true, name: true, type: true },
  });

  const paymentBreakdownFormatted = paymentMethodBreakdown.map((p) => ({
    method: methods.find((m) => m.id === p.methodId)?.name || "Unknown",
    type: methods.find((m) => m.id === p.methodId)?.type || "CASH",
    total: Number(p._sum.amount || 0),
    count: p._count,
  }));

  // Process Top Orders
  const topOrders = topOrdersRaw.map(o => ({
    id: o.id,
    orderNumber: o.id.slice(-6).toUpperCase(),
    date: o.createdAt.toISOString(),
    customerName: o.customer?.name || "Walk-in",
    employeeName: o.user?.name || "Unknown",
    grandTotal: Number(o.grandTotal),
  }));

  return NextResponse.json({
    ok: true,
    data: {
      kpis: {
        ordersToday: totalOrdersToday,
        revenueToday: Number(totalRevenueTodayAgg._sum.grandTotal || 0),
        activeTables: activeTablesCount,
        totalOrdersPeriod: paidOrders.length,
        totalRevenuePeriod: paidOrders.reduce((sum, o) => sum + Number(o.grandTotal), 0),
      },
      revenueChart,
      topProducts,
      topCategories,
      topOrders,
      paymentBreakdown: paymentBreakdownFormatted,
    },
  });
}
