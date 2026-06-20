/* eslint-disable react-hooks/immutability */
"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tag, Search } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isVisible: boolean;
  _count: { products: number };
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  const [form, setForm] = useState({
    name: "",
    color: "#E5E7EB",
    sortOrder: 0,
    isVisible: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.data || []);
    setLoading(false);
  };

  const filteredCategories = categories.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setForm({ name: "", color: "#E5E7EB", sortOrder: 0, isVisible: true });
    setEditCategory(null);
    setShowAddModal(true);
  };

  const openEdit = (c: Category) => {
    setForm({
      name: c.name,
      color: c.color,
      sortOrder: c.sortOrder,
      isVisible: c.isVisible,
    });
    setEditCategory(c);
    setShowAddModal(true);
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder),
    };

    if (editCategory) {
      const res = await fetch(`/api/categories/${editCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editCategory.id ? data.data : c)),
        );
      } else {
        alert(data.error);
      }
    } else {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setCategories((prev) => [
          ...prev,
          { ...data.data, _count: { products: 0 } },
        ]);
      } else {
        alert(data.error);
      }
    }
    setShowAddModal(false);
  };

  const deleteCategory = async (c: Category) => {
    if (c._count.products > 0) {
      alert(
        "Cannot delete category with attached products. Please reassign or delete products first.",
      );
      return;
    }
    if (!confirm("Are you sure you want to delete this category?")) return;

    const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      setCategories((prev) => prev.filter((cat) => cat.id !== c.id));
    } else {
      alert(data.error || "Failed to delete category");
    }
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1300px", margin: "0 auto" }}>
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
          Categories
        </h1>
        <button
          onClick={openAdd}
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(var(--color-primary-rgb),0.3)",
          }}
        >
          <Plus size={16} /> Add Category
        </button>
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
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px 10px 10px 36px",
            width: "100%",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-overlay)",
            color: "var(--color-text)",
          }}
        />
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--color-text-faint)",
          }}
        >
          Loading categories...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredCategories.map((c) => (
            <div
              key={c.id}
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: `${c.color}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: c.color,
                  }}
                >
                  <Tag size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "var(--color-text)",
                    }}
                  >
                    {c.name}
                  </h3>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-faint)",
                      marginTop: "4px",
                    }}
                  >
                    {c._count.products} Products • Sort: {c.sortOrder}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                <button
                  onClick={() => openEdit(c)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "8px",
                    borderRadius: "8px",
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={() => deleteCategory(c)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
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
            e.target === e.currentTarget && setShowAddModal(false)
          }
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "400px",
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
              {editCategory ? "Edit Category" : "Add Category"}
            </h3>

            <form
              onSubmit={saveCategory}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Category Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Hot Coffees"
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-overlay)",
                    color: "var(--color-text)",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Color
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    style={{
                      width: "40px",
                      height: "40px",
                      padding: "0",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background: "transparent",
                    }}
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    pattern="^#[0-9A-Fa-f]{6}$"
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg-overlay)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Sort Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-overlay)",
                    color: "var(--color-text)",
                  }}
                />
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  type="checkbox"
                  checked={form.isVisible}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isVisible: e.target.checked }))
                  }
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "var(--color-primary)",
                  }}
                />
                <label
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "var(--color-text)",
                  }}
                >
                  Visible on Menu
                </label>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    padding: "11px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background:
                      "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                    color: "#fff",
                    padding: "11px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  {editCategory ? "Save Changes" : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
