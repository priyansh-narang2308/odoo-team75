/* eslint-disable react-hooks/refs */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Table2,
  IndianRupee,
  BarChart3,
  RefreshCw,
  Wifi,
  WifiOff,
  Download,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

interface KPIs {
  ordersToday: number;
  revenueToday: number;
  activeTables: number;
  totalOrdersPeriod: number;
  totalRevenuePeriod: number;
}

interface ReportData {
  kpis: KPIs;
  revenueChart: { date: string; revenue: number }[];
  topProducts: {
    productId: string;
    name: string;
    totalQty: number;
    totalRevenue: number;
  }[];
  topCategories: {
    id: string;
    name: string;
    color: string;
    totalQty: number;
    totalRevenue: number;
  }[];
  topOrders: {
    id: string;
    orderNumber: string;
    date: string;
    customerName: string;
    employeeName: string;
    grandTotal: number;
  }[];
  paymentBreakdown: {
    method: string;
    type: string;
    total: number;
    count: number;
  }[];
}

interface FilterOptions {
  employees: { id: string; name: string }[];
  sessions: { id: string; name: string }[];
  products: { id: string; name: string }[];
}

const PIE_COLORS = [
  "var(--color-primary)",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function AdminDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    employees: [],
    sessions: [],
    products: [],
  });

  // Filter States
  const [period, setPeriod] = useState<
    "today" | "this_week" | "this_month" | "7d" | "30d" | "90d" | "custom"
  >("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [productId, setProductId] = useState("");

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { socket, isConnected } = useSocket();

  const fetchDataRef = useRef<() => Promise<void>>(null as any);

  // Initial Filter Options Load
  useEffect(() => {
    fetch("/api/reports/filters")
      .then((res) => res.json())
      .then((res) => {
        if (res.ok) setFilterOptions(res.data);
      });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        if (customStart) params.append("startDate", customStart);
        if (customEnd) params.append("endDate", customEnd);
      }
      if (employeeId) params.append("employeeId", employeeId);
      if (sessionId) params.append("sessionId", sessionId);
      if (productId) params.append("productId", productId);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, employeeId, sessionId, productId]);

  fetchDataRef.current = fetchData;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Real-time: join admin room & auto-refresh on any order activity
  useEffect(() => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.JOIN_ADMIN);
    const handleRefresh = () => fetchDataRef.current?.();
    socket.on(SOCKET_EVENTS.ORDER_STATUS, handleRefresh);
    socket.on(SOCKET_EVENTS.ORDER_PLACED, handleRefresh);
    socket.on(SOCKET_EVENTS.PAYMENT_RECEIVED, handleRefresh);
    socket.on(SOCKET_EVENTS.KDS_ORDER_COMPLETE, handleRefresh);

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS, handleRefresh);
      socket.off(SOCKET_EVENTS.ORDER_PLACED, handleRefresh);
      socket.off(SOCKET_EVENTS.PAYMENT_RECEIVED, handleRefresh);
      socket.off(SOCKET_EVENTS.KDS_ORDER_COMPLETE, handleRefresh);
    };
  }, [socket]);

  const handleExportCSV = () => {
    if (!data) return;

    // We'll export the Top Orders for the period as the CSV
    const headers = [
      "Order Number",
      "Date",
      "Customer",
      "Employee",
      "Grand Total",
    ];
    const rows = data.topOrders.map((o) => [
      o.orderNumber,
      new Date(o.date).toLocaleString(),
      o.customerName,
      o.employeeName,
      o.grandTotal.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `report_${period}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = data?.kpis;

  return (
    <div style={{ padding: "28px", maxWidth: "1400px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>
            Dashboard & Reports
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--color-text-muted)",
                fontSize: "14px",
              }}
            >
              Last updated:{" "}
              {lastUpdated ? format(lastUpdated, "HH:mm:ss") : "--:--:--"}
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: "600",
                color: isConnected ? "#22c55e" : "#ef4444",
                padding: "2px 8px",
                borderRadius: "999px",
                background: isConnected
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(239,68,68,0.1)",
              }}
            >
              {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={fetchData}
            style={{
              padding: "8px",
              borderRadius: "8px",
              background: "var(--color-bg-overlay)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div
        className="card"
        style={{
          padding: "16px",
          marginBottom: "28px",
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          background: "var(--color-bg-elevated)",
          borderRadius: "12px",
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} color="var(--color-primary)" />
          <span style={{ fontWeight: "600", fontSize: "14px" }}>Filters:</span>
        </div>

        {/* Period Filter */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            background: "var(--color-bg-overlay)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontSize: "13px",
            outline: "none",
          }}
        >
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="custom">Custom Range</option>
        </select>

        {period === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                background: "var(--color-bg-overlay)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontSize: "13px",
              }}
            />
            <span style={{ color: "var(--color-text-muted)" }}>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                background: "var(--color-bg-overlay)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontSize: "13px",
              }}
            />
          </div>
        )}

        {/* Employee Filter */}
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            background: "var(--color-bg-overlay)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontSize: "13px",
            outline: "none",
          }}
        >
          <option value="">All Employees</option>
          {filterOptions.employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>

        {/* Session Filter */}
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            background: "var(--color-bg-overlay)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontSize: "13px",
            outline: "none",
            maxWidth: "200px",
          }}
        >
          <option value="">All Sessions</option>
          {filterOptions.sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Product Filter */}
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            background: "var(--color-bg-overlay)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontSize: "13px",
            outline: "none",
            maxWidth: "200px",
          }}
        >
          <option value="">All Products</option>
          {filterOptions.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {[
          {
            id: "kpi-orders-today",
            label: "Orders Today",
            value: kpis?.ordersToday ?? "—",
            icon: ShoppingBag,
            color: "var(--color-primary)",
            subtitle: `${kpis?.totalOrdersPeriod ?? 0} in period`,
          },
          {
            id: "kpi-revenue-today",
            label: "Revenue Today",
            value: kpis ? formatCurrency(kpis.revenueToday) : "—",
            icon: IndianRupee,
            color: "#22c55e",
            subtitle: kpis
              ? `${formatCurrency(kpis.totalRevenuePeriod)} in period`
              : "",
          },
          {
            id: "kpi-active-tables",
            label: "Active Tables",
            value: kpis?.activeTables ?? "—",
            icon: Table2,
            color: "#3b82f6",
            subtitle: "Currently serving",
          },
          {
            id: "kpi-avg-order",
            label: "Avg. Order Value",
            value:
              kpis && kpis.totalOrdersPeriod > 0
                ? formatCurrency(
                  kpis.totalRevenuePeriod / kpis.totalOrdersPeriod,
                )
                : "—",
            icon: TrendingUp,
            color: "#8b5cf6",
            subtitle: "Per order in period",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              className="card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                border: `1px solid ${kpi.color}22`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: `${kpi.color}10`,
                }}
              />
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${kpi.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} color={kpi.color} />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {kpi.label}
                </p>
                <p
                  style={{
                    margin: "4px 0 2px",
                    fontSize: "26px",
                    fontWeight: "800",
                    color: "var(--color-text)",
                  }}
                >
                  {loading ? (
                    <span style={{ opacity: 0.3 }}>...</span>
                  ) : (
                    kpi.value
                  )}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "var(--color-text-faint)",
                  }}
                >
                  {kpi.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Revenue Chart */}
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            <BarChart3 size={18} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
              Revenue Trend
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.revenueChart || []}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(230, 168, 183, 0.2)"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(parseISO(d), "MMM d")}
                tick={{ fill: "#E6A8B7", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tickFormatter={(val) => `₹${val}`}
                tick={{ fill: "#E6A8B7", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                dx={-10}
                width={60}
              />
              <Tooltip
                formatter={(value: any) => [
                  formatCurrency(Number(value)),
                  "Revenue",
                ]}
                labelFormatter={(label) =>
                  format(parseISO(label), "MMM d, yyyy")
                }
                contentStyle={{
                  background: "#1a1a24",
                  border: "1px solid rgba(230,168,183,0.2)",
                  borderRadius: "12px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                  color: "#fff",
                }}
                itemStyle={{
                  color: "var(--color-primary)",
                  fontWeight: "bold",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-primary)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Categories Pie Chart */}
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
              Sales by Category
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data?.topCategories || []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="totalRevenue"
              >
                {data?.topCategories.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{
                  background: "#1a1a24",
                  border: "1px solid rgba(230,168,183,0.2)",
                  borderRadius: "12px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Top Products */}
        <div className="card">
          <h3
            style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "700" }}
          >
            Top Selling Products
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {data?.topProducts.map((p, i) => (
              <div
                key={p.productId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  background: "var(--color-bg-overlay)",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background:
                        i < 3 ? "var(--color-primary)" : "var(--color-border)",
                      color: i < 3 ? "#fff" : "var(--color-text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p
                      style={{ margin: 0, fontWeight: "600", fontSize: "14px" }}
                    >
                      {p.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "var(--color-text-faint)",
                      }}
                    >
                      {p.totalQty} units sold
                    </p>
                  </div>
                </div>
                <div
                  style={{ fontWeight: "700", color: "var(--color-primary)" }}
                >
                  {formatCurrency(p.totalRevenue)}
                </div>
              </div>
            ))}
            {data?.topProducts.length === 0 && (
              <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
                No data available.
              </p>
            )}
          </div>
        </div>

        {/* Top Categories Table */}
        <div className="card">
          <h3
            style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "700" }}
          >
            Category Performance
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {data?.topCategories.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  background: "var(--color-bg-overlay)",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: c.color || PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  ></div>
                  <div>
                    <p
                      style={{ margin: 0, fontWeight: "600", fontSize: "14px" }}
                    >
                      {c.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "var(--color-text-faint)",
                      }}
                    >
                      {c.totalQty} units sold
                    </p>
                  </div>
                </div>
                <div
                  style={{ fontWeight: "700", color: "var(--color-primary)" }}
                >
                  {formatCurrency(c.totalRevenue)}
                </div>
              </div>
            ))}
            {data?.topCategories.length === 0 && (
              <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
                No data available.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top Orders Table */}
      <div className="card" style={{ padding: "20px", marginBottom: "40px" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "700" }}>
          Highest-Value Orders
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                  fontSize: "13px",
                }}
              >
                <th style={{ padding: "12px", fontWeight: "600" }}>Order #</th>
                <th style={{ padding: "12px", fontWeight: "600" }}>Date</th>
                <th style={{ padding: "12px", fontWeight: "600" }}>Customer</th>
                <th style={{ padding: "12px", fontWeight: "600" }}>Employee</th>
                <th
                  style={{
                    padding: "12px",
                    fontWeight: "600",
                    textAlign: "right",
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.topOrders.map((o) => (
                <tr
                  key={o.id}
                  style={{
                    borderBottom: "1px solid var(--color-border-muted)",
                  }}
                >
                  <td
                    style={{
                      padding: "14px 12px",
                      fontWeight: "600",
                      color: "var(--color-primary)",
                    }}
                  >
                    #{o.orderNumber}
                  </td>
                  <td style={{ padding: "14px 12px", fontSize: "13px" }}>
                    {new Date(o.date).toLocaleString()}
                  </td>
                  <td style={{ padding: "14px 12px", fontSize: "13px" }}>
                    {o.customerName}
                  </td>
                  <td style={{ padding: "14px 12px", fontSize: "13px" }}>
                    {o.employeeName}
                  </td>
                  <td
                    style={{
                      padding: "14px 12px",
                      fontWeight: "700",
                      textAlign: "right",
                    }}
                  >
                    {formatCurrency(o.grandTotal)}
                  </td>
                </tr>
              ))}
              {(!data?.topOrders || data.topOrders.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    No orders found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
