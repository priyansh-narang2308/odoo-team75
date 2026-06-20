/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Smile,
  ShoppingBag,
  Calendar,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  lastOrderAt: string | null;
  createdAt: string;
  orderCount: number;
}

export function CustomersManager() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(
    null,
  );
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = () => {
    setLoading(true);
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load customers:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term))
      );
    });
  }, [search, customers]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.orderCount > 0).length;
    return { total, active };
  }, [customers]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [filteredCustomers, currentPage]);

  const handleOpenModal = (customer?: CustomerRecord) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: "", email: "", phone: "" });
    }
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : "/api/customers";
      const method = editingCustomer ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      toast.success(editingCustomer ? "Customer updated" : "Customer created");
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || "Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (id: string, orderCount: number) => {
    if (orderCount > 0) {
      return toast.error("Cannot delete a customer with existing orders.");
    }
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      toast.success("Customer deleted");
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customer");
    }
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1200px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>
            Customer Database
          </h1>
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              gap: "8px",
              alignItems: "center",
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
                id="customer-search"
                type="text"
                value={search}
                placeholder="Search by name, email, or phone"
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: "320px", paddingLeft: "36px" }}
              />
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  background: "var(--color-bg-overlay)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--color-text-muted)",
              fontSize: "14px",
            }}
          >
            {stats.total} total registered accounts
            {search
              ? ` · showing ${filteredCustomers.length} result${filteredCustomers.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--color-primary)",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(var(--color-primary-rgb), 0.2)",
          }}
        >
          <Plus size={16} /> New Customer
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        {/* Card 1: Total Customers */}
        <div
          className="card"
          style={{
            padding: "18px",
            border: "1px solid rgba(var(--color-primary-rgb), 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(var(--color-primary-rgb), 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)",
              }}
            >
              <Smile size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: "800" }}>
                {stats.total}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                }}
              >
                Total Signups
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Active Customers */}
        <div
          className="card"
          style={{
            padding: "18px",
            border: "1px solid rgba(34, 197, 94, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(34, 197, 94, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-success)",
              }}
            >
              <ShoppingBag size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: "800" }}>
                {stats.active}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                }}
              >
                Ordered at Least Once
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {[
                "Customer",
                "Contact",
                "Orders Placed",
                "Last Order",
                "Signed Up",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
                    textAlign: h === "Actions" ? "right" : "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "var(--color-text-faint)",
                  }}
                >
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filteredCustomers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "var(--color-text-faint)",
                  }}
                >
                  No customer records found.
                </td>
              </tr>
            )}
            {paginatedCustomers.map((c) => {
              const hue =
                c.name
                  .split("")
                  .reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
              const avatarBg = `hsla(${hue}, 70%, 40%, 0.15)`;
              const avatarColor = `hsl(${hue}, 70%, 65%)`;

              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: "1px solid var(--color-border-muted)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--color-bg-overlay)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* Name column */}
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: avatarBg,
                          border: `2px solid ${avatarColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: avatarColor,
                          flexShrink: 0,
                        }}
                      >
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "600" }}>
                        {c.name}
                      </span>
                    </div>
                  </td>

                  {/* Contact details */}
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          color: "var(--color-text)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Mail size={12} color="var(--color-text-faint)" />{" "}
                        {c.email}
                      </span>
                      {c.phone && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Phone size={12} color="var(--color-text-faint)" />{" "}
                          {c.phone}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Orders Placed */}
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 10px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background:
                          c.orderCount > 0
                            ? "rgba(34, 197, 94, 0.12)"
                            : "rgba(255, 255, 255, 0.04)",
                        color:
                          c.orderCount > 0
                            ? "#4ade80"
                            : "var(--color-text-muted)",
                      }}
                    >
                      {c.orderCount} order{c.orderCount === 1 ? "" : "s"}
                    </span>
                  </td>

                  {/* Last Order Date */}
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {c.lastOrderAt ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Calendar size={12} />{" "}
                        {format(new Date(c.lastOrderAt), "dd MMM yyyy HH:mm")}
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-text-faint)" }}>
                        Never
                      </span>
                    )}
                  </td>

                  {/* Signed Up Date */}
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      color: "var(--color-text-faint)",
                    }}
                  >
                    {format(new Date(c.createdAt), "dd MMM yyyy")}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={() => handleOpenModal(c)}
                        style={{
                          background: "var(--color-bg-overlay)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "6px",
                          padding: "6px",
                          color: "var(--color-text)",
                          cursor: "pointer",
                        }}
                        title="Edit Customer"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c.id, c.orderCount)}
                        disabled={c.orderCount > 0}
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          borderRadius: "6px",
                          padding: "6px",
                          color:
                            c.orderCount > 0
                              ? "var(--color-text-faint)"
                              : "#ef4444",
                          cursor: c.orderCount > 0 ? "not-allowed" : "pointer",
                          opacity: c.orderCount > 0 ? 0.5 : 1,
                        }}
                        title="Delete Customer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
            padding: "0 10px",
          }}
        >
          <div style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of{" "}
            {filteredCustomers.length} customers
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background:
                  currentPage === 1 ? "transparent" : "var(--color-bg-overlay)",
                color:
                  currentPage === 1
                    ? "var(--color-text-faint)"
                    : "var(--color-text)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Previous
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--color-text)",
              }}
            >
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background:
                  currentPage === totalPages
                    ? "transparent"
                    : "var(--color-bg-overlay)",
                color:
                  currentPage === totalPages
                    ? "var(--color-text-faint)"
                    : "var(--color-text)",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--color-bg)",
              width: "100%",
              maxWidth: "400px",
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
                {editingCustomer ? "Edit Customer" : "New Customer"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSaveCustomer}
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--color-text)",
                    marginBottom: "6px",
                  }}
                >
                  Full Name
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. John Doe"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-elevated)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--color-text)",
                    marginBottom: "6px",
                  }}
                >
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="e.g. john@example.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-elevated)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--color-text)",
                    marginBottom: "6px",
                  }}
                >
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="e.g. +91 9876543210"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-elevated)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div style={{ marginTop: "8px" }}>
                <button
                  disabled={isSaving}
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    background: "var(--color-primary)",
                    color: "white",
                    fontWeight: "600",
                    border: "none",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving
                    ? "Saving..."
                    : editingCustomer
                      ? "Save Changes"
                      : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
