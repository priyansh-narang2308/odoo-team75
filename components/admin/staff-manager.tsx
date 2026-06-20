"use client";

import { useMemo, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Shield, Coffee, ChefHat } from "lucide-react";
import { format } from "date-fns";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CASHIER" | "KITCHEN";
  isActive: boolean;
  createdAt: string;
}

type StaffRole = StaffMember["role"];

const ROLE_CONFIG = {
  ADMIN:   { icon: Shield,  color: "var(--color-primary)", bg: "rgba(var(--color-primary-rgb),0.15)",  label: "Admin" },
  CASHIER: { icon: Coffee,  color: "#3b82f6", bg: "rgba(59,130,246,0.15)",  label: "Cashier" },
  KITCHEN: { icon: ChefHat, color: "#22c55e", bg: "rgba(34,197,94,0.15)",   label: "Kitchen" },
};

export function StaffManager() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "CASHIER" as StaffRole, password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => { setStaff(d.data || []); setLoading(false); });
  }, []);

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staff;

    return staff.filter((member) => {
      return (
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.role.toLowerCase().includes(term)
      );
    });
  }, [search, staff]);

  const openAdd = () => {
    setForm({ name: "", email: "", role: "CASHIER", password: "" });
    setEditMember(null);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (m: StaffMember) => {
    setForm({ name: m.name, email: m.email, role: m.role, password: "" });
    setEditMember(m);
    setError(null);
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editMember) {
        const body: { name: string; role: StaffRole; password?: string } = { name: form.name, role: form.role };
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/staff/${editMember.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.ok) { setError(data.error); return; }
        setStaff((prev) => prev.map((s) => s.id === editMember.id ? data.data : s));
      } else {
        const res = await fetch("/api/staff", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!data.ok) { setError(data.error); return; }
        setStaff((prev) => [data.data, ...prev]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m: StaffMember) => {
    const res = await fetch(`/api/staff/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !m.isActive }),
    });
    const data = await res.json();
    if (data.ok) setStaff((prev) => prev.map((s) => s.id === m.id ? data.data : s));
  };

  const deleteStaff = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>Staff Management</h1>
          <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              id="staff-search"
              type="text"
              value={search}
              placeholder="Search by name, email, or role"
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: "320px" }}
            />
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
                }}
              >
                Clear
              </button>
            )}
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
            {staff.filter((s) => s.isActive).length} active members
            {search ? ` · showing ${filteredStaff.length} result${filteredStaff.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <button
          id="add-staff-btn"
          onClick={openAdd}
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))", color: "#fff", padding: "10px 20px", borderRadius: "10px", fontWeight: "600", boxShadow: "0 4px 12px rgba(var(--color-primary-rgb),0.3)" }}
        >
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* Role summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "28px" }}>
        {(["ADMIN", "CASHIER", "KITCHEN"] as const).map((role) => {
          const cfg = ROLE_CONFIG[role];
          const Icon = cfg.icon;
          const count = staff.filter((s) => s.role === role && s.isActive).length;
          return (
            <div key={role} className="card" style={{ padding: "18px", border: `1px solid ${cfg.color}22` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color={cfg.color} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "22px", fontWeight: "800" }}>{count}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)" }}>{cfg.label}s</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {["Name", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--color-text-faint)" }}>Loading...</td></tr>
            )}
            {!loading && filteredStaff.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--color-text-faint)" }}>
                  No staff members match your search.
                </td>
              </tr>
            )}
            {filteredStaff.map((m) => {
              const cfg = ROLE_CONFIG[m.role];
              const Icon = cfg.icon;
              return (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--color-border-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-overlay)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: cfg.bg, border: `2px solid ${cfg.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: cfg.color, flexShrink: 0 }}>
                        {m.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "600" }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--color-text-muted)" }}>{m.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", background: cfg.bg, color: cfg.color }}>
                      <Icon size={11} /> {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      id={`toggle-staff-${m.id}`}
                      onClick={() => toggleActive(m)}
                      style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", background: m.isActive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", color: m.isActive ? "#4ade80" : "#f87171", border: "none", cursor: "pointer" }}
                    >
                      {m.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--color-text-faint)" }}>
                    {format(new Date(m.createdAt), "dd MMM yyyy")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button id={`edit-staff-${m.id}`} onClick={() => openEdit(m)} style={{ padding: "6px 10px", borderRadius: "7px", background: "var(--color-bg-overlay)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
                        <Pencil size={13} />
                      </button>
                      <button id={`del-staff-${m.id}`} onClick={() => deleteStaff(m.id)} style={{ padding: "6px 10px", borderRadius: "7px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "16px", padding: "28px", maxWidth: "440px", width: "100%", animation: "fadeIn 0.2s ease" }}>
            <h3 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: "700" }}>{editMember ? "Edit Staff" : "Add Staff Member"}</h3>
            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>{error}</div>
            )}
            <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label>Full Name *</label>
                <input id="staff-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Riya Sharma" required />
              </div>
              {!editMember && (
                <div>
                  <label>Email *</label>
                  <input id="staff-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="staff@cafeodoo.com" required />
                </div>
              )}
              <div>
                <label>Role *</label>
                <select id="staff-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}>
                  <option value="CASHIER">Cashier</option>
                  <option value="KITCHEN">Kitchen</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label>{editMember ? "New Password (leave blank to keep)" : "Password *"}</label>
                <input id="staff-password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" required={!editMember} />
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: "var(--color-bg-overlay)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", padding: "11px", justifyContent: "center" }}>Cancel</button>
                <button id="staff-save-btn" type="submit" disabled={saving} style={{ flex: 1, background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))", color: "#fff", padding: "11px", justifyContent: "center", fontWeight: "600" }}>
                  {saving ? "Saving..." : editMember ? "Save Changes" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
