/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Tag,
  PackageCheck,
  PackageX,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
  _count: { products: number };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  taxRate: number;
  unitOfMeasure: "PIECE" | "KG" | "LITRE";
  isAvailable: boolean;
  isArchived: boolean;
  categoryId: string;
  category: { id: string; name: string; color: string };
}

export function MenuManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    taxRate: "5",
    unitOfMeasure: "PIECE",
    categoryId: "",
    isAvailable: true,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/products?available=false").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([p, c]) => {
      setProducts(p.data || []);
      setCategories(c.data || []);
      setLoading(false);
    });
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchCat = !selectedCat || p.categoryId === selectedCat;
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && !p.isArchived;
  });

  // Reset page when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCat]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Ensure we don't end up on an invalid page if items are deleted
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const openAdd = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      taxRate: "5",
      unitOfMeasure: "PIECE",
      categoryId: categories[0]?.id || "",
      isAvailable: true,
    });
    setEditProduct(null);
    setShowAddProduct(true);
    setShowAddCat(false);
    setNewCatName("");
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      taxRate: String(p.taxRate),
      unitOfMeasure: p.unitOfMeasure || "PIECE",
      categoryId: p.categoryId,
      isAvailable: p.isAvailable,
    });
    setEditProduct(p);
    setShowAddProduct(true);
    setShowAddCat(false);
    setNewCatName("");
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim(), color: "#4ade80" }),
    });
    const data = await res.json();
    if (data.ok) {
      setCategories((prev) => [
        ...prev,
        { ...data.data, _count: { products: 0 } },
      ]);
      setForm((f) => ({ ...f, categoryId: data.data.id }));
      setShowAddCat(false);
      setNewCatName("");
    } else {
      alert(data.error);
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      taxRate: parseFloat(form.taxRate),
    };

    if (editProduct) {
      const res = await fetch(`/api/products/${editProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === editProduct.id ? data.data : p)),
      );
    } else {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setProducts((prev) => [data.data, ...prev]);
    }
    setShowAddProduct(false);
  };

  const toggleAvailability = async (p: Product) => {
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !p.isAvailable }),
    });
    const data = await res.json();
    setProducts((prev) => prev.map((pr) => (pr.id === p.id ? data.data : pr)));
  };

  const archiveProduct = async (id: string) => {
    if (!confirm("Archive this product? It won't appear on the menu.")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1300px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>
          Menu Management
        </h1>
        <button
          id="add-product-btn"
          onClick={openAdd}
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(var(--color-primary-rgb),0.3)",
          }}
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Category tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <button
          id="cat-filter-all"
          onClick={() => setSelectedCat(null)}
          style={{
            padding: "6px 16px",
            borderRadius: "999px",
            fontSize: "13px",
            fontWeight: "600",
            background: !selectedCat
              ? "var(--color-primary)"
              : "var(--color-bg-overlay)",
            color: !selectedCat ? "#fff" : "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
          }}
        >
          All ({products.filter((p) => !p.isArchived).length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`cat-filter-${cat.id}`}
            onClick={() =>
              setSelectedCat(cat.id === selectedCat ? null : cat.id)
            }
            style={{
              padding: "6px 16px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "600",
              background:
                selectedCat === cat.id
                  ? `${cat.color}22`
                  : "var(--color-bg-overlay)",
              color:
                selectedCat === cat.id ? cat.color : "var(--color-text-muted)",
              border: `1px solid ${selectedCat === cat.id ? cat.color + "44" : "var(--color-border)"}`,
            }}
          >
            {cat.name} ({cat._count.products})
          </button>
        ))}
      </div>

      {/* Search */}
      <div
        style={{
          position: "relative",
          maxWidth: "360px",
          marginBottom: "20px",
        }}
      >
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
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "36px" }}
        />
      </div>

      {/* Products Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {["Product", "Category", "Price", "Tax", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
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
            {paginatedProducts.map((p) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: "1px solid var(--color-border-muted)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--color-bg-overlay)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td style={{ padding: "12px 16px" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--color-text)",
                    }}
                  >
                    {p.name}
                  </p>
                  {p.description && (
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "12px",
                        color: "var(--color-text-faint)",
                      }}
                    >
                      {p.description.slice(0, 50)}...
                    </p>
                  )}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      background: `${p.category.color}22`,
                      color: p.category.color,
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {p.category.name}
                  </span>
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "var(--color-text)",
                  }}
                >
                  {formatCurrency(Number(p.price))}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {p.taxRate}%
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    id={`toggle-avail-${p.id}`}
                    onClick={() => toggleAvailability(p)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: p.isAvailable
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(239,68,68,0.1)",
                      color: p.isAvailable ? "#4ade80" : "#f87171",
                      border: "none",
                    }}
                  >
                    {p.isAvailable ? (
                      <PackageCheck size={12} />
                    ) : (
                      <PackageX size={12} />
                    )}
                    {p.isAvailable ? "Available" : "Unavailable"}
                  </button>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      id={`edit-product-${p.id}`}
                      onClick={() => openEdit(p)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "7px",
                        background: "var(--color-bg-overlay)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-muted)",
                        fontSize: "12px",
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      id={`archive-product-${p.id}`}
                      onClick={() => archiveProduct(p.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "7px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171",
                        fontSize: "12px",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
            {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of{" "}
            {filteredProducts.length} products
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

      {/* Add/Edit Modal */}
      {showAddProduct && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) =>
            e.target === e.currentTarget && setShowAddProduct(false)
          }
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "480px",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <h3
              style={{
                margin: "0 0 24px",
                fontSize: "18px",
                fontWeight: "700",
              }}
            >
              {editProduct ? "Edit Product" : "Add Product"}
            </h3>

            <form
              onSubmit={saveProduct}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label>Product Name *</label>
                <input
                  id="form-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Flat White"
                  required
                />
              </div>
              <div>
                <label>Description</label>
                <input
                  id="form-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Short description..."
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label>Price (₹) *</label>
                  <input
                    id="form-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label>Tax Rate (%)</label>
                  <input
                    id="form-tax"
                    type="number"
                    min="0"
                    max="28"
                    value={form.taxRate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, taxRate: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label>Unit</label>
                  <select
                    id="form-unit"
                    value={form.unitOfMeasure}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))
                    }
                  >
                    <option value="PIECE">Per Piece</option>
                    <option value="KG">Per Kg</option>
                    <option value="LITRE">Per Litre</option>
                  </select>
                </div>
              </div>
              <div>
                <label>Category *</label>
                {!showAddCat ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      style={{ flex: 1 }}
                      id="form-category"
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, categoryId: e.target.value }))
                      }
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCat(true)}
                      style={{
                        padding: "0 12px",
                        background: "var(--color-bg-overlay)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                      }}
                    >
                      + New
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      style={{ flex: 1 }}
                      autoFocus
                      placeholder="New category name"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      style={{
                        padding: "0 12px",
                        background: "var(--color-primary)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCat(false)}
                      style={{
                        padding: "0 12px",
                        background: "var(--color-bg-overlay)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  id="form-available"
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isAvailable: e.target.checked }))
                  }
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "var(--color-primary)",
                  }}
                />
                <label style={{ margin: 0 }}>Available on menu</label>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  style={{
                    flex: 1,
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    padding: "11px",
                    justifyContent: "center",
                  }}
                >
                  Cancel
                </button>
                <button
                  id="form-save-btn"
                  type="submit"
                  style={{
                    flex: 1,
                    background:
                      "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                    color: "#fff",
                    padding: "11px",
                    justifyContent: "center",
                    fontWeight: "600",
                  }}
                >
                  {editProduct ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
