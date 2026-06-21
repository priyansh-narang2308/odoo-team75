import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  startOfWeek,
  startOfMonth,
} from "date-fns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
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

  // Orders that have at least one payment record = actually paid (cash/UPI/card)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderWhere: any = {
    payments: { some: {} },
    createdAt: { gte: startDate, lte: endDate },
    status: { not: "CANCELLED" },
  };

  if (employeeId) orderWhere.userId = employeeId;
  if (sessionId) orderWhere.sessionId = sessionId;
  if (productId) orderWhere.items = { some: { productId } };

  // Today's base filter (same logic but scoped to today)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todayWhere: any = {
    ...orderWhere,
    createdAt: {
      gte: startOfDay(new Date()),
      lte: endOfDay(new Date()),
    },
  };

  // Active tables = tables with orders not yet paid
  const activeTablesPromise = prisma.table.count({
    where: {
      orders: {
        some: { status: { in: ["DRAFT", "SENT", "PREPARING", "READY"] } },
      },
    },
  });

  const [
    totalOrdersToday,
    activeTablesCount,
    paidOrders,
    topProductsAgg,
    revenueByDayQuery,
    paymentMethodBreakdown,
    topOrdersRaw,
    todayPaymentsAgg,
  ] = await Promise.all([
    // Today's count — orders with at least one payment today
    prisma.order.count({ where: todayWhere }),

    activeTablesPromise,

    // All orders with payments in the period
    prisma.order.findMany({
      where: orderWhere,
      include: {
        payments: {
          include: { method: { select: { type: true, name: true } } },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                categoryId: true,
                category: { select: { name: true, color: true } },
              },
            },
          },
        },
      },
    }),

    // Top selling products
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: orderWhere },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),

    // Revenue by day — from actual payment records
    prisma.payment.findMany({
      where: {
        order: orderWhere,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { amount: true, createdAt: true },
    }),

    // Payment method breakdown
    prisma.payment.groupBy({
      by: ["methodId"],
      where: { order: orderWhere },
      _sum: { amount: true },
      _count: true,
    }),

    // Top orders by grand total
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { grandTotal: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
        customer: { select: { name: true } },
      },
    }),

    // Today's revenue from actual payment records
    prisma.payment.aggregate({
      where: {
        order: todayWhere,
        createdAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
      _sum: { amount: true },
    }),
  ]);

  // Process top products
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
  const categoryMap: Record<
    string,
    { id: string; name: string; color: string; totalQty: number; totalRevenue: number }
  > = {};

  paidOrders.forEach((order) => {
    order.items.forEach((item) => {
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

  const topCategories = Object.values(categoryMap).sort(
    (a, b) => b.totalRevenue - a.totalRevenue,
  );

  // Revenue chart — grouped by day from actual payment records
  const dayMap: Record<string, number> = {};
  revenueByDayQuery.forEach((p) => {
    const day = format(p.createdAt, "yyyy-MM-dd");
    dayMap[day] = (dayMap[day] || 0) + Number(p.amount);
  });

  const revenueChart = Object.entries(dayMap)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Payment method breakdown
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

  // Total revenue = sum of all payment amounts in period
  const totalRevenuePeriod = paidOrders.reduce(
    (sum, o) => sum + o.payments.reduce((s, p) => s + Number(p.amount), 0),
    0,
  );

  // Top orders
  const topOrders = topOrdersRaw.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber?.toString() || o.id.slice(-6).toUpperCase(),
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
        revenueToday: Number(todayPaymentsAgg._sum.amount || 0),
        activeTables: activeTablesCount,
        totalOrdersPeriod: paidOrders.length,
        totalRevenuePeriod,
      },
      revenueChart,
      topProducts,
      topCategories,
      topOrders,
      paymentBreakdown: paymentBreakdownFormatted,
    },
  });
}
