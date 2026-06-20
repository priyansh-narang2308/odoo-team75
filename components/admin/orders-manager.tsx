/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Search, ShoppingBag, Wifi, WifiOff, X, Edit, Trash2 } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import toast from "react-hot-toast";

interface Order {
  id: string;
  orderNumber: number;
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
  source: "CUSTOMER" | "CASHIER";
  createdAt: string;
  grandTotal: number;
  customer: { name: string; email: string | null } | null;
  table: { tableNumber: string; floor: { name: string } } | null;
  items: { id: string; quantity: number; product: { name: string }; kdsStatus: string }[];
  payments: { method: { name: string; type: string } }[];
}

function computeDisplayStatus(order: Order) {
  if (order.status === "DRAFT" || order.status === "CANCELLED" || order.status === "PAID") return order.status;
  
  if (!order.items || order.items.length === 0) return order.status;

  const statuses = order.items.map(i => i.kdsStatus);
  if (statuses.every(s => s === "COMPLETED")) return "READY";
  if (statuses.some(s => s === "PREPARING" || s === "COMPLETED")) return "PREPARING";
  
  return order.status;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  SENT: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  PREPARING: { bg: "rgba(234,179,8,0.15)", text: "#eab308" },
  READY: { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
  PAID: { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
  CANCELLED: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
};

export function OrdersManager() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { socket, isConnected } = useSocket();

  const fetchOrdersRef = useRef<() => void>(null as any);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    fetch(`/api/orders?limit=1000${showTodayOnly ? "&dateRange=today" : ""}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setOrders(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [showTodayOnly]);

  // eslint-disable-next-line react-hooks/refs
  fetchOrdersRef.current = fetchOrders;

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time: join admin room & refresh on order changes
  useEffect(() => {
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.JOIN_ADMIN);

    const handleOrderUpdate = () => {
      fetchOrdersRef.current?.();
    };

    socket.on(SOCKET_EVENTS.ORDER_STATUS, handleOrderUpdate);
    socket.on(SOCKET_EVENTS.ORDER_PLACED, handleOrderUpdate);
    socket.on(SOCKET_EVENTS.KDS_ITEM_UPDATED, handleOrderUpdate);
    socket.on(SOCKET_EVENTS.KDS_ORDER_COMPLETE, handleOrderUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS, handleOrderUpdate);
      socket.off(SOCKET_EVENTS.ORDER_PLACED, handleOrderUpdate);
      socket.off(SOCKET_EVENTS.KDS_ITEM_UPDATED, handleOrderUpdate);
      socket.off(SOCKET_EVENTS.KDS_ORDER_COMPLETE, handleOrderUpdate);
    };
  }, [socket]); // Only depends on socket

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const query = search.toLowerCase();
    const dateStr = format(new Date(o.createdAt), "MMM d").toLowerCase();
    return (
      o.orderNumber.toString().includes(query) ||
      o.table?.tableNumber.toLowerCase().includes(query) ||
      o.customer?.name.toLowerCase().includes(query) ||
      dateStr.includes(query) ||
      o.items.some((i) => i.product.name.toLowerCase().includes(query))
    );
  });

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, showTodayOnly]);

  const handleDeleteDraft = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this draft order?")) return;
    
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success("Draft order cancelled");
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    }
  };

  const handleEditDraft = (orderId: string) => {
    router.push(`/pos?editOrderId=${orderId}`);
  };

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ padding: "28px", maxWidth: "1200px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>Order History</h1>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: "600",
              color: isConnected ? "#22c55e" : "#ef4444",
              padding: "3px 10px",
              borderRadius: "999px",
              background: isConnected ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            }}
          >
            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={showTodayOnly}
              onChange={(e) => setShowTodayOnly(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "var(--color-primary)" }}
            />
            Today Only
          </label>
          <div style={{ position: "relative", width: "300px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)" }} />
            <input
              placeholder="Search order #, customer, table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: "36px", background: "var(--color-bg-elevated)" }}
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div style={{ background: "var(--color-bg-elevated)", borderRadius: "16px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-faint)" }}>Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--color-text-faint)" }}>
            <ShoppingBag size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <p>No orders found matching your search.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-bg-overlay)", borderBottom: "1px solid var(--color-border-muted)", textAlign: "left", fontSize: "13px", color: "var(--color-text-muted)" }}>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Order #</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Date</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Customer</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Table</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Total</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Payment</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const displayStatus = computeDisplayStatus(order);
                const statusStyle = STATUS_COLORS[displayStatus] || STATUS_COLORS.DRAFT;
                return (
                  <tr 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    style={{ borderBottom: "1px solid var(--color-border-muted)", transition: "background 0.2s", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-bg-overlay)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "16px 20px", fontSize: "15px", fontWeight: "700", color: "var(--color-primary)" }}>
                      #{order.orderNumber}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "var(--color-text)" }}>
                      {format(new Date(order.createdAt), "MMM d, h:mm a")}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: "500", color: order.customer ? "var(--color-text)" : "var(--color-text-faint)" }}>
                      {order.customer ? order.customer.name : "Walk-in"}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      {order.table ? (
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600" }}>{order.table.tableNumber}</div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-faint)" }}>{order.table.floor.name}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "14px", color: "var(--color-text-faint)" }}>Takeaway</span>
                      )}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "15px", fontWeight: "600" }}>
                      {formatCurrency(Number(order.grandTotal))}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "var(--color-text-muted)" }}>
                      {order.payments && order.payments.length > 0 ? order.payments[0].method.name : "Unpaid"}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", background: statusStyle.bg, color: statusStyle.text }}>
                        {displayStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", padding: "0 10px" }}>
          <div style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: currentPage === 1 ? "transparent" : "var(--color-bg-overlay)",
                color: currentPage === 1 ? "var(--color-text-faint)" : "var(--color-text)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              Previous
            </button>
            <div style={{ display: "flex", alignItems: "center", padding: "0 10px", fontSize: "14px", fontWeight: "600", color: "var(--color-text)" }}>
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: currentPage === totalPages ? "transparent" : "var(--color-bg-overlay)",
                color: currentPage === totalPages ? "var(--color-text-faint)" : "var(--color-text)",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "var(--color-bg)", width: "100%", maxWidth: "500px", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>Order #{selectedOrder.orderNumber}</h2>
                <div style={{ fontSize: "13px", color: "var(--color-text-faint)", marginTop: "4px" }}>
                  {format(new Date(selectedOrder.createdAt), "MMM d, yyyy h:mm a")}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: "4px" }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-faint)", fontWeight: "600", textTransform: "uppercase" }}>Customer</div>
                  <div style={{ fontSize: "15px", fontWeight: "600" }}>{selectedOrder.customer ? selectedOrder.customer.name : "Walk-in"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-faint)", fontWeight: "600", textTransform: "uppercase" }}>Status</div>
                  <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", background: STATUS_COLORS[selectedOrder.status]?.bg, color: STATUS_COLORS[selectedOrder.status]?.text }}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "var(--color-text-faint)", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>Items</div>
              <div style={{ background: "var(--color-bg-overlay)", borderRadius: "8px", padding: "12px", marginBottom: "20px" }}>
                {selectedOrder.items.map(item => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span>{item.quantity}x {item.product.name}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: "1px dashed var(--color-border)" }}>
                <span style={{ fontSize: "16px", fontWeight: "700" }}>Grand Total</span>
                <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--color-primary)" }}>{formatCurrency(Number(selectedOrder.grandTotal))}</span>
              </div>
            </div>

            {selectedOrder.status === "DRAFT" && (
              <div style={{ padding: "20px", borderTop: "1px solid var(--color-border)", display: "flex", gap: "12px" }}>
                <button
                  onClick={() => handleEditDraft(selectedOrder.id)}
                  style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid var(--color-primary)", background: "rgba(var(--color-primary-rgb), 0.1)", color: "var(--color-primary)", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" }}
                >
                  <Edit size={16} /> Edit Order
                </button>
                <button
                  onClick={() => handleDeleteDraft(selectedOrder.id)}
                  style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ef4444", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" }}
                >
                  <Trash2 size={16} /> Cancel Order
                </button>
              </div>
            )}
            {selectedOrder.status !== "DRAFT" && (
              <div style={{ padding: "20px", borderTop: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-text-faint)", fontSize: "13px" }}>
                This order is {selectedOrder.status} and cannot be edited.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
