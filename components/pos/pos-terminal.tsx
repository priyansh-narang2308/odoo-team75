/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Send,
  CreditCard,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Layers,
  Users,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Image from "next/image";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { ReceiptPrinter } from "@/components/shared/receipt-printer";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  taxRate: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: { id: string; name: string; color: string };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Floor {
  id: string;
  name: string;
  sortOrder: number;
  gridWidth: number;
  gridHeight: number;
  _count?: { tables: number };
}

interface Table {
  id: string;
  tableNumber: string;
  seats: number;
  isActive: boolean;
  floorId: string;
  floor?: { id: string; name: string; gridWidth: number; gridHeight: number };
  orders?: { id: string; status: string; grandTotal: number }[];
  x: number;
  y: number;
  width: number;
  height: number;
  status: string;
}

function CollapsibleFloor({
  floor,
  tables,
  isOpen,
  onToggle,
  onSelectTable,
  selectedTableId,
  handleFreeTable,
  isFreeing,
}: {
  floor: Floor;
  tables: Table[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectTable: (tableId: string) => void;
  selectedTableId: string;
  handleFreeTable: (tableId: string) => void;
  isFreeing: boolean;
}) {
  return (
    <div
      style={{
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "8px",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--color-bg-overlay)",
          border: "none",
          textAlign: "left",
          borderRadius: "8px",
          color: "var(--color-text)",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={16} color="var(--color-primary)" />
          <span style={{ fontWeight: "600", fontSize: "15px" }}>
            {floor.name}
          </span>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            ({tables.length} tables)
          </span>
        </div>
        <div>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "16px 8px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "10px",
              }}
            >
              {tables.map((table) => {
                const hasActiveOrder = !!(
                  table.orders && table.orders.length > 0
                );
                const activeOrder = table.orders?.[0] || null;
                const isSelected = selectedTableId === table.id;

                return (
                  <div
                    key={table.id}
                    onClick={() => onSelectTable(table.id)}
                    style={{
                      padding: "12px 10px",
                      borderRadius: "8px",
                      border: isSelected
                        ? "2px solid var(--color-primary)"
                        : "1px solid var(--color-border)",
                      background: isSelected
                        ? "rgba(var(--color-primary-rgb), 0.1)"
                        : "var(--color-bg-elevated)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      position: "relative",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: "700" }}>
                      T-{table.tableNumber}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--color-text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <Users size={10} /> {table.seats} seats
                    </span>

                    {/* Status Badge */}
                    <span
                      style={{
                        marginTop: "6px",
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "999px",
                        fontWeight: "600",
                        background: hasActiveOrder
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(34, 197, 94, 0.15)",
                        color: hasActiveOrder ? "#f59e0b" : "#4ade80",
                      }}
                    >
                      {hasActiveOrder ? "Occupied" : "Available"}
                    </span>

                    {hasActiveOrder && activeOrder && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--color-primary)",
                          fontWeight: "600",
                          marginTop: "2px",
                        }}
                      >
                        {formatCurrency(Number(activeOrder.grandTotal))}
                      </span>
                    )}

                    {hasActiveOrder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFreeing) return;
                          handleFreeTable(table.id);
                        }}
                        style={{
                          marginTop: "8px",
                          fontSize: "10px",
                          fontWeight: "600",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        Free Table
                      </button>
                    )}
                  </div>
                );
              })}
              {tables.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "20px",
                    color: "var(--color-text-faint)",
                    fontSize: "13px",
                  }}
                >
                  No active tables on this floor
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function POSTerminal() {
  const router = useRouter();
  const [step, setStep] = useState<"TABLE_SELECTION" | "MENU">(
    "TABLE_SELECTION",
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showPayment, setShowPayment] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Load order for editing if ?editOrderId is present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const editOrderId = searchParams.get("editOrderId");
    if (editOrderId) {
      fetch(`/api/orders/${editOrderId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.data && data.data.status === "DRAFT") {
            const order = data.data;
            clearCart();
            setOrderId(order.id);
            if (order.tableId) setTableId(order.tableId);
            if (order.customerId)
              setCustomer(order.customerId, order.customer?.name || null);

            // Note: promotion handling might be missing, but DRAFT orders might not have it saved correctly yet

            order.items.forEach((item: any) => {
              addItem({
                productId: item.productId,
                name: item.product.name,
                price: Number(item.product.price),
                taxRate: Number(item.product.taxRate),
                imageUrl: item.product.imageUrl,
                notes: item.notes || undefined,
              });
              updateQuantity(item.productId, item.quantity);
            });

            window.history.replaceState({}, "", window.location.pathname);
            setStep("MENU");
            toast.success("Draft order loaded for editing");
          }
        });
    }
  }, []);
  const [paymentMethods, setPaymentMethods] = useState<
    { id: string; name: string; type: string }[]
  >([]);
  const [receipt, setReceipt] = useState<{
    orderId: string;
    orderNumber: number;
    paymentMethod: string;
    snapshotItems: {
      name: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[];
    snapshotSubtotal: number;
    snapshotTax: number;
    snapshotDiscount?: number;
    snapshotGrandTotal: number;
  } | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [actionTableId, setActionTableId] = useState<string | null>(null);
  const [sendingToKitchen, setSendingToKitchen] = useState(false);

  // Session Management
  const [activeSession, setActiveSession] = useState<{
    id: string;
    openedAt: string;
    openingAmount: number;
  } | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    taxTotal,
    grandTotal,
    totalItems,
    customerId,
    customerName,
    setCustomer,
    appliedPromotion,
    setAppliedPromotion,
    discountTotal,
    orderId,
    setOrderId,
    setTableId,
  } = useCartStore();
  const { socket, isConnected } = useSocket();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchCurrentSession = async () => {
    try {
      const res = await fetch("/api/sessions/current");
      const data = await res.json();
      if (data.ok && data.data) {
        setActiveSession({
          id: data.data.id,
          openedAt: data.data.openedAt,
          openingAmount: data.data.openingAmount,
        });
      } else {
        router.push("/pos");
      }
    } catch (err) {
      console.error(err);
      router.push("/pos");
    } finally {
      setIsSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentSession();

    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/tables").then((r) => r.json()),
      fetch("/api/floors").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ]).then(([prod, cat, tbls, flrs, cust]) => {
      setProducts(prod.data || []);
      setCategories(cat.data || []);
      setTables(tbls.data || []);
      setFloors(flrs.data || []);
      setCustomers(cust.data || []);
    });

    // Fetch payment methods
    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setPaymentMethods(d.data || []);
      })
      .catch(() => {
        setPaymentMethods([
          { id: "pm-cash", name: "Cash", type: "CASH" },
          { id: "pm-upi", name: "UPI / QR", type: "UPI" },
          { id: "pm-card", name: "Credit/Debit Card", type: "CARD" },
        ]);
      });
  }, []);

  // Fetch Auto Promotions
  useEffect(() => {
    if (items.length === 0) {
      setAppliedPromotion(null);
      return;
    }

    const fetchPromotions = async () => {
      try {
        const orderTotal = items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0,
        );
        const itemsQuery = encodeURIComponent(
          JSON.stringify(
            items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price,
            })),
          ),
        );
        const res = await fetch(
          `/api/promotions/auto?orderTotal=${orderTotal}&items=${itemsQuery}`,
        );
        const data = await res.json();
        if (data.ok && data.data && data.data.length > 0) {
          setAppliedPromotion(data.data[0]); // Apply the best auto-promotion
        } else {
          setAppliedPromotion(null);
        }
      } catch (err) {
        console.error("Failed to fetch promotions", err);
      }
    };

    fetchPromotions();
  }, [items, setAppliedPromotion]);

  // Real-time updates for table occupancy status
  useEffect(() => {
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.JOIN_CASHIER);

    const handleRefresh = async () => {
      try {
        const tblsRes = await fetch("/api/tables");
        const tblsData = await tblsRes.json();
        if (tblsData.ok) {
          setTables(tblsData.data || []);
        }
      } catch (err) {
        console.error("Failed to refresh tables:", err);
      }
    };

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

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomerForm),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const newCustomer = data.data;
      setCustomers((prev) => [newCustomer, ...prev]);
      setCustomer(newCustomer.id, newCustomer.name);
      setShowCreateCustomer(false);
      setShowCustomerModal(false);
      setNewCustomerForm({ name: "", email: "", phone: "" });
      toast.success("Customer created and assigned!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCategory || p.category.id === selectedCategory;
    return matchesSearch && matchesCat && p.isAvailable;
  });

  // Pagination — 10 items per page
  const ITEMS_PER_PAGE = 10;
  const [menuPage, setMenuPage] = useState(0);

  // Reset to page 0 whenever search or category changes
  useEffect(() => {
    setMenuPage(0);
  }, [search, selectedCategory]);

  const totalMenuPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE),
  );
  const paginatedProducts = filteredProducts.slice(
    menuPage * ITEMS_PER_PAGE,
    (menuPage + 1) * ITEMS_PER_PAGE,
  );

  const handleAddProduct = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      taxRate: Number(product.taxRate),
      imageUrl: product.imageUrl,
    });
  };

  const [isFreeing, setIsFreeing] = useState(false);

  const handleFreeTable = async (tableId: string) => {
    setIsFreeing(true);
    try {
      const res = await fetch(`/api/tables/${tableId}/free`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Table freed successfully");
        if (selectedTableId === tableId) {
          clearCart();
          setSelectedTableId("");
          setStep("TABLE_SELECTION");
        }
        // Refresh tables
        const tblsRes = await fetch("/api/tables");
        const tblsData = await tblsRes.json();
        if (tblsData.ok) {
          setTables(tblsData.data || []);
        }
      } else {
        toast.error(data.error || "Failed to free table");
      }
    } catch (err) {
      toast.error("Failed to free table");
    } finally {
      setIsFreeing(false);
    }
  };

  const changeTable = (newTableId: string) => {
    if (selectedTableId !== newTableId) {
      clearCart();
    }
    setSelectedTableId(newTableId);
    setIsTableModalOpen(false);
    setStep("MENU");
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const hasActiveOrders =
    selectedTable && selectedTable.orders && selectedTable.orders.length > 0;

  const renderChairsAroundTable = (seats: number, statusColor: string) => {
    const chairs = [];
    const radius = 5; // dot radius
    if (seats <= 2) {
      chairs.push(
        <div
          key="L"
          style={{
            position: "absolute",
            left: `-${radius * 1.5}px`,
            top: `calc(50% - ${radius}px)`,
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderRadius: "50%",
            background: statusColor,
          }}
        />,
      );
      chairs.push(
        <div
          key="R"
          style={{
            position: "absolute",
            right: `-${radius * 1.5}px`,
            top: `calc(50% - ${radius}px)`,
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderRadius: "50%",
            background: statusColor,
          }}
        />,
      );
    } else if (seats <= 4) {
      chairs.push(
        <div
          key="L"
          style={{
            position: "absolute",
            left: `-${radius * 1.5}px`,
            top: `calc(50% - ${radius}px)`,
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderRadius: "50%",
            background: statusColor,
          }}
        />,
      );
      chairs.push(
        <div
          key="R"
          style={{
            position: "absolute",
            right: `-${radius * 1.5}px`,
            top: `calc(50% - ${radius}px)`,
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderRadius: "50%",
            background: statusColor,
          }}
        />,
      );
      chairs.push(
        <div
          key="T"
          style={{
            position: "absolute",
            top: `-${radius * 1.5}px`,
            left: `calc(50% - ${radius}px)`,
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderRadius: "50%",
            background: statusColor,
          }}
        />,
      );
      chairs.push(
        <div
          key="B"
          style={{
            position: "absolute",
            bottom: `-${radius * 1.5}px`,
            left: `calc(50% - ${radius}px)`,
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderRadius: "50%",
            background: statusColor,
          }}
        />,
      );
    } else {
      const sideCount = Math.ceil(seats / 2);
      for (let i = 0; i < sideCount; i++) {
        const offsetPct = ((i + 1) / (sideCount + 1)) * 100;
        chairs.push(
          <div
            key={`T-${i}`}
            style={{
              position: "absolute",
              top: `-${radius * 1.5}px`,
              left: `calc(${offsetPct}% - ${radius}px)`,
              width: `${radius * 2}px`,
              height: `${radius * 2}px`,
              borderRadius: "50%",
              background: statusColor,
            }}
          />,
        );
        chairs.push(
          <div
            key={`B-${i}`}
            style={{
              position: "absolute",
              bottom: `-${radius * 1.5}px`,
              left: `calc(${offsetPct}% - ${radius}px)`,
              width: `${radius * 2}px`,
              height: `${radius * 2}px`,
              borderRadius: "50%",
              background: statusColor,
            }}
          />,
        );
      }
    }
    return chairs;
  };

  // Render modal for table selection
  const renderTableModal = () => {
    const activeFloor = floors.find((f) => f.id === selectedFloorId);
    const activeFloorTables = activeFloor
      ? tables.filter((t) => t.floorId === activeFloor.id && t.isActive)
      : [];
    const actionTable = tables.find((t) => t.id === actionTableId);

    return (
      <AnimatePresence>
        {isTableModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: "95%",
                maxWidth: "900px",
                maxHeight: "90vh",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "20px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "12px",
                }}
              >
                <div>
                  <h3
                    style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}
                  >
                    Select Table
                  </h3>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Choose a table from the floor map layout to begin taking
                    orders.
                  </p>
                </div>
                <button
                  onClick={() => setIsTableModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-muted)",
                    padding: "6px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--color-bg-overlay)";
                    e.currentTarget.style.color = "var(--color-text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-text-muted)";
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Floor Tabs Selection inside Modal */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  marginBottom: "16px",
                  paddingBottom: "8px",
                  borderBottom: "1.5px solid var(--color-border)",
                }}
              >
                {floors.map((floor) => (
                  <button
                    key={floor.id}
                    onClick={() => setSelectedFloorId(floor.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background:
                        selectedFloorId === floor.id
                          ? "rgba(200, 121, 65, 0.15)"
                          : "var(--color-bg-overlay)",
                      color:
                        selectedFloorId === floor.id
                          ? "#c87941"
                          : "var(--color-text-muted)",
                      border:
                        selectedFloorId === floor.id
                          ? "1px solid #c87941"
                          : "1px solid var(--color-border)",
                      fontWeight: "600",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {floor.name}
                  </button>
                ))}
              </div>

              {/* Floor Map Layout Canvas */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  paddingRight: "4px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {activeFloor ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      flex: 1,
                    }}
                  >
                    {/* Status legends */}
                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        fontSize: "12px",
                        fontWeight: "600",
                        padding: "0 4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#10b981",
                          }}
                        ></span>
                        Available
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#ef4444",
                          }}
                        ></span>
                        Occupied
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#f59e0b",
                          }}
                        ></span>
                        Reserved
                      </div>
                    </div>

                    {/* Viewport for scaling */}
                    <div
                      id="pos-canvas-viewport"
                      style={{
                        height: "420px",
                        width: "100%",
                        background: "#0b0f19",
                        border: "1px solid var(--color-border)",
                        borderRadius: "16px",
                        overflow: "hidden",
                        position: "relative",
                        boxShadow: "inset 0 4px 20px rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {/* CSS Grid Container */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${activeFloor.gridWidth}, 1fr)`,
                          gridTemplateRows: `repeat(${activeFloor.gridHeight}, 1fr)`,
                          gap: "8px",
                          width: "100%",
                          maxHeight: "100%",
                          aspectRatio: `${activeFloor.gridWidth} / ${activeFloor.gridHeight}`,
                          background: "#0f172a", // slate 900
                          borderRadius: "12px",
                          padding: "8px",
                          position: "relative",
                        }}
                      >
                        {/* Grid cells guides backdrop */}
                        {Array.from({ length: activeFloor.gridHeight }).map(
                          (_, r) =>
                            Array.from({ length: activeFloor.gridWidth }).map(
                              (_, c) => (
                                <div
                                  key={`${r}-${c}`}
                                  style={{
                                    background: "rgba(255, 255, 255, 0.015)",
                                    border:
                                      "1px dashed rgba(255, 255, 255, 0.04)",
                                    borderRadius: "6px",
                                    gridColumnStart: c + 1,
                                    gridRowStart: r + 1,
                                  }}
                                />
                              ),
                            ),
                        )}

                        {/* Tables */}
                        {activeFloorTables.map((table) => {
                          const hasActiveOrder =
                            table.orders && table.orders.length > 0;
                          const activeOrder = table.orders?.[0] || null;

                          let statusColor = "#10b981"; // green
                          let statusBg = "rgba(16, 185, 129, 0.12)";
                          let borderHighlight = "1.5px solid #10b981";

                          if (hasActiveOrder || table.status === "OCCUPIED") {
                            statusColor = "#ef4444"; // red
                            statusBg = "rgba(239, 68, 68, 0.12)";
                            borderHighlight = "1.5px solid #ef4444";
                          } else if (table.status === "RESERVED") {
                            statusColor = "#f59e0b"; // amber
                            statusBg = "rgba(245, 158, 11, 0.12)";
                            borderHighlight = "1.5px solid #f59e0b";
                          }

                          return (
                            <button
                              key={table.id}
                              onClick={() => {
                                const isOccupied =
                                  hasActiveOrder || table.status === "OCCUPIED";
                                if (isOccupied) {
                                  setActionTableId(table.id);
                                } else {
                                  changeTable(table.id);
                                }
                              }}
                              style={{
                                gridColumn: `${table.x + 1} / span ${table.width}`,
                                gridRow: `${table.y + 1} / span ${table.height}`,
                                background: "#1e293b",
                                border: borderHighlight,
                                boxShadow: "0 4px 8px rgba(0,0,0,0.25)",
                                borderRadius: "12px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "2px",
                                cursor: "pointer",
                                padding: "4px",
                                position: "relative",
                                transition: "transform 0.15s ease",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.transform =
                                  "scale(1.03)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.transform = "scale(1.0)")
                              }
                            >
                              {/* Chairs Distributed outside the table */}
                              {renderChairsAroundTable(
                                table.seats,
                                statusColor,
                              )}

                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: "800",
                                  color: "#c87941",
                                }}
                              >
                                {table.tableNumber}
                              </span>
                              <span
                                style={{
                                  fontSize: "9px",
                                  color: "var(--color-text-muted)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "2px",
                                }}
                              >
                                <Users size={9} /> {table.seats}
                              </span>

                              <span
                                style={{
                                  fontSize: "8px",
                                  fontWeight: "800",
                                  padding: "1px 5px",
                                  borderRadius: "999px",
                                  color: statusColor,
                                  background: statusBg,
                                  marginTop: "1px",
                                }}
                              >
                                {hasActiveOrder || table.status === "OCCUPIED"
                                  ? "Occupied"
                                  : table.status === "RESERVED"
                                    ? "Reserved"
                                    : "Free"}
                              </span>

                              {hasActiveOrder && activeOrder && (
                                <span
                                  style={{
                                    fontSize: "9px",
                                    color: "var(--color-primary)",
                                    fontWeight: "700",
                                    marginTop: "1px",
                                  }}
                                >
                                  {formatCurrency(
                                    Number(activeOrder.grandTotal),
                                  )}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    No floor selected.
                  </div>
                )}
              </div>

              {/* Action Popup Dialog */}
              <AnimatePresence>
                {actionTableId && actionTable && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      backdropFilter: "blur(8px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1100,
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      style={{
                        width: "90%",
                        maxWidth: "400px",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "20px",
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "18px",
                        boxShadow:
                          "var(--shadow-lg), 0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: "800",
                            color: "var(--color-primary)",
                          }}
                        >
                          Table T-{actionTable.tableNumber} Actions
                        </h3>
                        <button
                          onClick={() => setActionTableId(null)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--color-text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "4px",
                            borderRadius: "50%",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--color-bg-overlay)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: "var(--color-text-muted)",
                          lineHeight: "1.5",
                        }}
                      >
                        This table is currently occupied. Would you like to
                        view/modify its menu order or free the table by marking
                        outstanding orders as paid?
                      </p>

                      {actionTable.orders && actionTable.orders.length > 0 && (
                        <div
                          style={{
                            padding: "12px 16px",
                            borderRadius: "10px",
                            background: "rgba(var(--color-primary-rgb), 0.12)",
                            border:
                              "1px solid rgba(var(--color-primary-rgb), 0.25)",
                            fontSize: "13px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--color-text-muted)",
                              fontWeight: "500",
                            }}
                          >
                            Active Bill:
                          </span>
                          <span
                            style={{
                              fontWeight: "800",
                              color: "var(--color-primary)",
                              fontSize: "16px",
                            }}
                          >
                            {formatCurrency(
                              Number(actionTable.orders[0].grandTotal),
                            )}
                          </span>
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          marginTop: "6px",
                        }}
                      >
                        <button
                          onClick={() => {
                            changeTable(actionTable.id);
                            setActionTableId(null);
                          }}
                          style={{
                            width: "100%",
                            padding: "12px",
                            fontSize: "14px",
                            fontWeight: "700",
                            background:
                              "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                            color: "var(--color-primary-text)",
                            border: "none",
                            borderRadius: "10px",
                            cursor: "pointer",
                            boxShadow:
                              "0 4px 12px rgba(var(--color-primary-rgb), 0.25)",
                          }}
                        >
                          Open Menu / View Order
                        </button>

                        <button
                          onClick={async () => {
                            if (
                              confirm(
                                `Are you sure you want to free Table ${actionTable.tableNumber}? This will mark all outstanding orders for this table as PAID.`,
                              )
                            ) {
                              setActionTableId(null);
                              await handleFreeTable(actionTable.id);
                            }
                          }}
                          disabled={isFreeing}
                          style={{
                            width: "100%",
                            padding: "12px",
                            fontSize: "14px",
                            fontWeight: "700",
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "10px",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(239, 68, 68, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(239, 68, 68, 0.1)";
                          }}
                        >
                          {isFreeing
                            ? "Freeing Table..."
                            : "Free Table (Mark Paid)"}
                        </button>

                        <button
                          onClick={() => setActionTableId(null)}
                          style={{
                            width: "100%",
                            padding: "10px",
                            fontSize: "13px",
                            fontWeight: "600",
                            background: "transparent",
                            color: "var(--color-text-faint)",
                            border: "1px solid var(--color-border-muted)",
                            borderRadius: "10px",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--color-text)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              "var(--color-text-faint)")
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  // Session state checks
  if (!mounted || isSessionLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--color-bg)",
          color: "var(--color-text-faint)",
        }}
      >
        Loading session...
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Loading terminal...
      </div>
    );
  }

  if (step === "TABLE_SELECTION") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          background: "var(--color-bg)",
          color: "var(--color-text)",
          padding: "24px",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            maxWidth: "1000px",
            width: "100%",
            margin: "0 auto 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              ☕ <span className="gradient-text">CafePOS Terminal</span>
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                color: "var(--color-text-muted)",
                fontSize: "14px",
              }}
            >
              Select a floor layout to view tables or place a direct counter
              order.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => router.push("/pos")}
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-danger)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-border)")
              }
            >
              Close Session
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: "600",
                color: isConnected ? "#22c55e" : "#ef4444",
                background: isConnected
                  ? "rgba(34, 197, 94, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
                padding: "6px 14px",
                borderRadius: "999px",
              }}
            >
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isConnected ? "Live" : "Offline"}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div
          style={{
            maxWidth: "1000px",
            width: "100%",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "32px",
          }}
        >
          {/* Quick Actions (Takeaway) */}
          <div>
            <h3
              style={{
                fontSize: "16px",
                color: "var(--color-text-muted)",
                marginBottom: "12px",
                fontWeight: "600",
              }}
            >
              Quick Service
            </h3>
            <button
              onClick={() => changeTable("")}
              style={{
                width: "100%",
                maxWidth: "320px",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "8px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = "1px solid var(--color-primary)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = "1px solid var(--color-border)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <ShoppingBag size={20} />
              </div>
              <div style={{ marginTop: "12px" }}>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "var(--color-text)",
                  }}
                >
                  Takeaway / Quick Order
                </span>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Create direct counter order without assigning a table.
                </p>
              </div>
            </button>
          </div>

          {/* Floors Section */}
          <div>
            <h3
              style={{
                fontSize: "16px",
                color: "var(--color-text-muted)",
                marginBottom: "16px",
                fontWeight: "600",
              }}
            >
              Floor Layouts
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {floors.map((floor) => {
                const floorTables = tables.filter(
                  (t) => t.floorId === floor.id,
                );
                const occupiedCount = floorTables.filter(
                  (t) => t.orders && t.orders.length > 0,
                ).length;

                return (
                  <button
                    key={floor.id}
                    onClick={() => {
                      setSelectedFloorId(floor.id);
                      setIsTableModalOpen(true);
                    }}
                    style={{
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "16px",
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        background: "rgba(var(--color-primary-rgb), 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-primary)",
                      }}
                    >
                      <Layers size={20} />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "var(--color-text)",
                        }}
                      >
                        {floor.name}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginTop: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--color-text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Users size={12} /> {floorTables.length} Tables
                        </span>
                        {occupiedCount > 0 && (
                          <span
                            style={{
                              fontSize: "13px",
                              color: "var(--color-warning)",
                              fontWeight: "600",
                            }}
                          >
                            {occupiedCount} Occupied
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Overlay rendered here */}
        {renderTableModal()}
      </div>
    );
  }

  // Otherwise, render MENU view
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        height: "100vh",
        overflow: "hidden",
        background: "var(--color-bg)",
      }}
    >
      {/* === LEFT: Menu Panel === */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-elevated)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Image
              src="/CafePOS.png"
              alt="CafePOS Logo"
              width={28}
              height={28}
              style={{ objectFit: "contain", height: "auto" }}
            />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
              Menu
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginLeft: "auto",
            }}
          >
            <button
              onClick={() => router.push("/pos")}
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                padding: "4px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-danger)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-border)")
              }
            >
              Close Session
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: isConnected ? "#22c55e" : "#ef4444",
              }}
            >
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isConnected ? "Live" : "Offline"}
            </div>
          </div>
        </div>

        {/* Table Banner */}
        <div
          style={{
            padding: "10px 16px",
            background: "var(--color-bg-overlay)",
            borderBottom: "1px solid var(--color-border-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: "600",
              color: "var(--color-text)",
            }}
          >
            <MapPin size={14} color="var(--color-primary)" />
            {selectedTableId && selectedTable ? (
              <span>
                Table {selectedTable.tableNumber} (
                {selectedTable.floor?.name || "Floor"})
              </span>
            ) : (
              <span>Takeaway / Quick Order</span>
            )}
          </div>
          <button
            onClick={() => setStep("TABLE_SELECTION")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              color: "var(--color-primary)",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Switch Table
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border-muted)",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-faint)",
              }}
            />
            <input
              id="pos-search"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
        </div>

        {/* Categories */}
        <div
          style={{
            padding: "10px 16px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            borderBottom: "1px solid var(--color-border-muted)",
          }}
        >
          <button
            id="cat-all"
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "6px 16px",
              borderRadius: "999px",
              background: !selectedCategory
                ? "var(--color-primary)"
                : "var(--color-bg-overlay)",
              color: !selectedCategory ? "#fff" : "var(--color-text-muted)",
              fontSize: "13px",
              fontWeight: "500",
              flexShrink: 0,
              border: "1px solid transparent",
              cursor: "pointer",
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`cat-${cat.id}`}
              onClick={() =>
                setSelectedCategory(cat.id === selectedCategory ? null : cat.id)
              }
              style={{
                padding: "6px 16px",
                borderRadius: "999px",
                background:
                  selectedCategory === cat.id
                    ? `${cat.color}22`
                    : "var(--color-bg-overlay)",
                color:
                  selectedCategory === cat.id
                    ? cat.color
                    : "var(--color-text-muted)",
                border: `1px solid ${selectedCategory === cat.id ? cat.color + "44" : "transparent"}`,
                fontSize: "13px",
                fontWeight: "500",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {/* Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "12px",
              alignContent: "start",
              flex: 1,
            }}
          >
            {paginatedProducts.map((product) => (
              <button
                key={product.id}
                id={`product-${product.id}`}
                onClick={() => handleAddProduct(product)}
                style={{
                  background: "var(--color-bg-elevated)",
                  border: `1px solid ${product.category.color ? product.category.color + "33" : "var(--color-border)"}`,
                  borderRadius: "12px",
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  position: "relative",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    product.category.color || "var(--color-primary)";
                  e.currentTarget.style.background = "var(--color-bg-overlay)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = product.category.color
                    ? product.category.color + "33"
                    : "var(--color-border)";
                  e.currentTarget.style.background = "var(--color-bg-elevated)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--color-text-muted)",
                    fontWeight: "600",
                    letterSpacing: "0.05em",
                  }}
                >
                  {product.category.name}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--color-text)",
                    lineHeight: "1.3",
                  }}
                >
                  {product.name}
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    color: product.category.color || "var(--color-primary)",
                    marginTop: "4px",
                  }}
                >
                  {formatCurrency(Number(product.price))}
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background:
                      product.category.color || "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.7,
                  }}
                >
                  <Plus size={12} color="#fff" />
                </div>
              </button>
            ))}

            {filteredProducts.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "var(--color-text-faint)",
                }}
              >
                No products found
              </div>
            )}
          </div>

          {/* Pagination Bar */}
          {totalMenuPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px 0 14px",
                borderTop: "1px solid var(--color-border-muted)",
                marginTop: "12px",
              }}
            >
              <button
                id="menu-page-prev"
                onClick={() => setMenuPage((p) => Math.max(0, p - 1))}
                disabled={menuPage === 0}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background:
                    menuPage === 0 ? "transparent" : "var(--color-bg-elevated)",
                  color:
                    menuPage === 0
                      ? "var(--color-text-faint)"
                      : "var(--color-text)",
                  cursor: menuPage === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  opacity: menuPage === 0 ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: totalMenuPages }).map((_, i) => (
                <button
                  key={i}
                  id={`menu-page-${i}`}
                  onClick={() => setMenuPage(i)}
                  style={{
                    minWidth: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    border: `1px solid ${menuPage === i ? "var(--color-primary)" : "var(--color-border)"}`,
                    background:
                      menuPage === i ? "var(--color-primary)" : "transparent",
                    color: menuPage === i ? "#fff" : "var(--color-text-muted)",
                    fontSize: "13px",
                    fontWeight: menuPage === i ? "700" : "500",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {i + 1}
                </button>
              ))}

              <button
                id="menu-page-next"
                onClick={() =>
                  setMenuPage((p) => Math.min(totalMenuPages - 1, p + 1))
                }
                disabled={menuPage === totalMenuPages - 1}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background:
                    menuPage === totalMenuPages - 1
                      ? "transparent"
                      : "var(--color-bg-elevated)",
                  color:
                    menuPage === totalMenuPages - 1
                      ? "var(--color-text-faint)"
                      : "var(--color-text)",
                  cursor:
                    menuPage === totalMenuPages - 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  opacity: menuPage === totalMenuPages - 1 ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >
                <ChevronRight size={15} />
              </button>

              <span
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  marginLeft: "4px",
                }}
              >
                {menuPage * ITEMS_PER_PAGE + 1}–
                {Math.min(
                  (menuPage + 1) * ITEMS_PER_PAGE,
                  filteredProducts.length,
                )}{" "}
                of {filteredProducts.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* === RIGHT: Cart === */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          background: "var(--color-bg-elevated)",
        }}
      >
        {/* Cart Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <ShoppingCart size={18} color="var(--color-primary)" />
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
            Current Order
          </h3>
          {mounted && totalItems() > 0 && (
            <span
              style={{
                marginLeft: "auto",
                background: "var(--color-primary)",
                color: "#fff",
                borderRadius: "999px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {totalItems()}
            </span>
          )}
        </div>

        {/* Table Selection - Read Only display */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border-muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            color: "var(--color-text-muted)",
          }}
        >
          <span>Serving Target:</span>
          <span style={{ fontWeight: "700", color: "var(--color-text)" }}>
            {selectedTableId && selectedTable
              ? `Table ${selectedTable.tableNumber}`
              : "Takeaway / Counter"}
          </span>
        </div>

        {/* Customer Assignment */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border-muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            color: "var(--color-text-muted)",
          }}
        >
          <span>Customer:</span>
          {customerId ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: "700", color: "var(--color-text)" }}>
                {customerName}
              </span>
              <button
                onClick={() => setCustomer(null, null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-faint)",
                  padding: "2px",
                }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomerModal(true)}
              style={{
                background: "transparent",
                border: "1px solid var(--color-primary)",
                color: "var(--color-primary)",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Assign Customer
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--color-text-faint)",
              }}
            >
              <ShoppingCart
                size={40}
                style={{ margin: "0 auto 12px", opacity: 0.3 }}
              />
              <p style={{ margin: 0, fontSize: "14px" }}>
                Select items from the menu
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {items.map((item) => (
                <div
                  key={item.productId}
                  style={{
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border-muted)",
                    borderRadius: "10px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: "8px" }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--color-text-faint)",
                          marginTop: "2px",
                        }}
                      >
                        1 × {formatCurrency(item.price)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      style={{
                        padding: "4px",
                        background: "transparent",
                        color: "var(--color-text-faint)",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        id={`minus-${item.productId}`}
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "6px",
                          background: "var(--color-border)",
                          padding: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: "700",
                          minWidth: "20px",
                          textAlign: "center",
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        id={`plus-${item.productId}`}
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "6px",
                          background: "var(--color-primary)",
                          padding: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={12} color="#fff" />
                      </button>
                    </div>
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "var(--color-primary)",
                      }}
                    >
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Actions */}
        {items.length > 0 && (
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Totals */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  color: "var(--color-text-muted)",
                }}
              >
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal())}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  color: "var(--color-text-muted)",
                }}
              >
                <span>Tax</span>
                <span>{formatCurrency(taxTotal())}</span>
              </div>
              {appliedPromotion && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    color: "var(--color-success, #10b981)",
                    fontWeight: "600",
                  }}
                >
                  <span>Discount ({appliedPromotion.name})</span>
                  <span>-{formatCurrency(discountTotal())}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "var(--color-text)",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--color-border-muted)",
                }}
              >
                <span>Total</span>
                <span style={{ color: "var(--color-primary)" }}>
                  {formatCurrency(grandTotal())}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >


              {/* Checkout (pay-first for counter customers) */}
              <button
                id="checkout-pay-btn"
                onClick={() => setShowCheckout(true)}
                disabled={items.length === 0}
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                  color: "#fff",
                  padding: "13px",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "15px",
                  boxShadow: "0 4px 16px rgba(var(--color-primary-rgb), 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <CreditCard size={16} />
                Checkout &amp; Pay
              </button>

              <button
                id="clear-cart-btn"
                onClick={() => {
                  clearCart();
                  setSelectedTableId("");
                  setStep("TABLE_SELECTION");
                }}
                style={{
                  background: "transparent",
                  color: "var(--color-text-faint)",
                  padding: "10px",
                  justifyContent: "center",
                  fontSize: "13px",
                  border: "1px solid var(--color-border-muted)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Clear Order
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Checkout Payment Dialog ── */}
      {showCheckout && (
        <PaymentDialog
          grandTotal={grandTotal()}
          subtotal={subtotal()}
          taxTotal={taxTotal()}
          items={items}
          tableId={selectedTableId || null}
          sessionId={activeSession?.id || null}
          customerId={customerId}
          orderId={orderId}
          appliedPromotionId={appliedPromotion?.id}
          discountTotal={discountTotal()}
          onSuccess={async (orderId, method) => {
            // Capture snapshot BEFORE clearing cart
            const snap = {
              items: items.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                unitPrice: i.price,
                lineTotal: i.price * i.quantity,
              })),
              subtotal: subtotal(),
              tax: taxTotal(),
              discount: discountTotal(),
              grand: grandTotal(),
            };
            setShowCheckout(false);
            const res = await fetch(`/api/orders/${orderId}`);
            const data = await res.json();
            if (data.ok) {
              setReceipt({
                orderId,
                orderNumber: data.data.orderNumber,
                paymentMethod: method,
                snapshotItems: snap.items,
                snapshotSubtotal: snap.subtotal,
                snapshotTax: snap.tax,
                snapshotGrandTotal: snap.grand,
                snapshotDiscount: snap.discount,
              } as any);
            }
            clearCart();
          }}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {/* ── Receipt Printer ── */}
      {receipt && (
        <ReceiptPrinter
          orderNumber={receipt.orderNumber}
          items={receipt.snapshotItems}
          subtotal={receipt.snapshotSubtotal}
          taxTotal={receipt.snapshotTax}
          discountTotal={receipt.snapshotDiscount || 0}
          grandTotal={receipt.snapshotGrandTotal}
          paymentMethod={receipt.paymentMethod}
          paidAt={new Date()}
          onClose={() => {
            setReceipt(null);
          }}
        />
      )}

      {/* ── Customer Selection Modal ── */}
      {showCustomerModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              padding: "24px",
              borderRadius: "12px",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0 }}>
                {showCreateCustomer ? "New Customer" : "Assign Customer"}
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                {!showCreateCustomer && (
                  <button
                    onClick={() => setShowCreateCustomer(true)}
                    style={{
                      background: "var(--color-primary)",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    + New
                  </button>
                )}
                <button
                  onClick={() => {
                    if (showCreateCustomer) {
                      setShowCreateCustomer(false);
                    } else {
                      setShowCustomerModal(false);
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {showCreateCustomer ? (
              <form
                onSubmit={handleCreateCustomer}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <input
                  required
                  placeholder="Full Name"
                  value={newCustomerForm.name}
                  onChange={(e) =>
                    setNewCustomerForm({
                      ...newCustomerForm,
                      name: e.target.value,
                    })
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-overlay)",
                    color: "var(--color-text)",
                  }}
                />
                <input
                  required
                  type="email"
                  placeholder="Email Address"
                  value={newCustomerForm.email}
                  onChange={(e) =>
                    setNewCustomerForm({
                      ...newCustomerForm,
                      email: e.target.value,
                    })
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-overlay)",
                    color: "var(--color-text)",
                  }}
                />
                <input
                  type="tel"
                  placeholder="Phone (Optional)"
                  value={newCustomerForm.phone}
                  onChange={(e) =>
                    setNewCustomerForm({
                      ...newCustomerForm,
                      phone: e.target.value,
                    })
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-overlay)",
                    color: "var(--color-text)",
                  }}
                />
                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  style={{
                    padding: "12px",
                    background: "var(--color-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: isCreatingCustomer ? "not-allowed" : "pointer",
                    opacity: isCreatingCustomer ? 0.7 : 1,
                  }}
                >
                  {isCreatingCustomer ? "Creating..." : "Create & Assign"}
                </button>
              </form>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCustomer(c.id, c.name);
                      setShowCustomerModal(false);
                    }}
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      background:
                        customerId === c.id
                          ? "var(--color-primary-light)"
                          : "var(--color-bg-overlay)",
                      border: "1px solid var(--color-border-muted)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {c.name}
                  </button>
                ))}
                {customers.length === 0 && (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    No customers found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
