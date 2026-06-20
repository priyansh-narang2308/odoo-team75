"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Clock,
  Phone,
  User,
  Trash2,
  Plus,
  ArrowRight,
  Sparkles,
  MapPin,
  CalendarDays,
  ListFilter,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

interface TableData {
  id: string;
  tableNumber: string;
  seats: number;
  floor: {
    id: string;
    name: string;
  };
}

interface Reservation {
  id: string;
  customerName: string;
  phone: string | null;
  seats: number;
  reserveTime: string;
  table: {
    tableNumber: string;
    floor: {
      name: string;
    };
  };
}

// Helper to get local YYYY-MM-DD date string
const getLocalDateString = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dateVal = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateVal}`;
};

// Helper to determine initial search parameters (date and time)
// based on local system time and the 10:00 AM - 11:59 PM booking window.
const getInitialDateTime = () => {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  let defaultTime = "10:00";

  // If we are currently inside the 10:00 AM - 11:59 PM window (10:00 to 23:59)
  if (currentTotalMinutes >= 10 * 60 && currentTotalMinutes <= 23 * 60 + 59) {
    // Default to the current local hour/minute
    defaultTime = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
  }

  return {
    date: getLocalDateString(now),
    time: defaultTime,
  };
};

interface ClockPickerProps {
  time: string; // "HH:MM"
  onChange: (newTime: string) => void;
  onClose: () => void;
}

function ClockPicker({ time, onChange, onClose }: ClockPickerProps) {
  const [hoursStr, minutesStr] = time.split(":");
  const selectedHour = parseInt(hoursStr) || 10;
  const selectedMinute = parseInt(minutesStr) || 0;
  const [mode, setMode] = useState<"hours" | "minutes">("hours");

  const selectHour = (h: number) => {
    if (h < 10 || h > 23) return;
    const newTime = `${String(h).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onChange(newTime);
    setMode("minutes");
  };

  const selectMinute = (m: number) => {
    if (m < 0 || m > 59) return;
    const newTime = `${String(selectedHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange(newTime);
  };

  const getHourPosition = (h: number) => {
    const isInner = h === 0 || h >= 13;
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;

    const angleDeg = hour12 * 30 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const radius = isInner ? 50 : 80;

    const x = 110 + radius * Math.cos(angleRad);
    const y = 110 + radius * Math.sin(angleRad);
    return { left: `${x}px`, top: `${y}px` };
  };

  const getMinutePosition = (m: number) => {
    const index = m / 5;
    const angleDeg = index * 30 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const radius = 80;

    const x = 110 + radius * Math.cos(angleRad);
    const y = 110 + radius * Math.sin(angleRad);
    return { left: `${x}px`, top: `${y}px` };
  };

  let handAngle = 0;
  let handLength = 80;

  if (mode === "hours") {
    let hour12 = selectedHour % 12;
    if (hour12 === 0) hour12 = 12;
    handAngle = hour12 * 30 - 90;
    const isInner = selectedHour === 0 || selectedHour >= 13;
    handLength = isInner ? 50 : 80;
  } else {
    handAngle = selectedMinute * 6 - 90;
    handLength = 80;
  }

  return (
    <div
      style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "16px",
        padding: "16px",
        width: "252px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 100,
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={() => setMode("hours")}
          style={{
            fontSize: "24px",
            fontWeight: "700",
            background: "transparent",
            border: "none",
            color: mode === "hours" ? "var(--color-primary)" : "var(--color-text-muted)",
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: "6px",
            backgroundColor: mode === "hours" ? "rgba(255,255,255,0.05)" : "transparent",
          }}
        >
          {String(selectedHour).padStart(2, '0')}
        </button>
        <span style={{ fontSize: "24px", fontWeight: "700", color: "var(--color-text-muted)" }}>:</span>
        <button
          type="button"
          onClick={() => setMode("minutes")}
          style={{
            fontSize: "24px",
            fontWeight: "700",
            background: "transparent",
            border: "none",
            color: mode === "minutes" ? "var(--color-primary)" : "var(--color-text-muted)",
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: "6px",
            backgroundColor: mode === "minutes" ? "rgba(255,255,255,0.05)" : "transparent",
          }}
        >
          {String(selectedMinute).padStart(2, '0')}
        </button>
      </div>

      <div
        style={{
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          background: "var(--color-bg-overlay)",
          border: "1px solid var(--color-border-muted)",
          position: "relative",
          userSelect: "none",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "108px",
            top: "108px",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "var(--color-primary)",
            zIndex: 10,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "109px",
            bottom: "110px",
            width: "2px",
            height: `${handLength}px`,
            background: "var(--color-primary)",
            transformOrigin: "bottom center",
            transform: `rotate(${handAngle + 90}deg)`,
            zIndex: 2,
            transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        {mode === "hours" ? (
          Array.from({ length: 24 }, (_, i) => {
            const h = i;
            const isDisabled = h < 10 || h > 23;
            const isSelected = selectedHour === h;
            const pos = getHourPosition(h);
            return (
              <button
                key={h}
                type="button"
                disabled={isDisabled}
                onClick={() => selectHour(h)}
                style={{
                  position: "absolute",
                  transform: "translate(-50%, -50%)",
                  left: pos.left,
                  top: pos.top,
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: "none",
                  background: isSelected ? "var(--color-primary)" : "transparent",
                  color: isSelected
                    ? "#fff"
                    : isDisabled
                    ? "var(--color-text-faint)"
                    : "var(--color-text)",
                  fontSize: h >= 13 || h === 0 ? "10px" : "12px",
                  fontWeight: isSelected ? "700" : "500",
                  cursor: isDisabled ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 3,
                  padding: 0,
                }}
              >
                {h === 0 ? "00" : h}
              </button>
            );
          })
        ) : (
          Array.from({ length: 12 }, (_, i) => {
            const m = i * 5;
            const isSelected = Math.round(selectedMinute / 5) * 5 === m;
            const pos = getMinutePosition(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => selectMinute(m)}
                style={{
                  position: "absolute",
                  transform: "translate(-50%, -50%)",
                  left: pos.left,
                  top: pos.top,
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: "none",
                  background: isSelected ? "var(--color-primary)" : "transparent",
                  color: isSelected ? "#fff" : "var(--color-text)",
                  fontSize: "12px",
                  fontWeight: isSelected ? "700" : "500",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 3,
                  padding: 0,
                }}
              >
                {String(m).padStart(2, '0')}
              </button>
            );
          })
        )}
      </div>

      {mode === "minutes" && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => selectMinute((selectedMinute - 1 + 60) % 60)}
            style={{
              padding: "4px 8px",
              background: "var(--color-bg-overlay)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            -1 min
          </button>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Fine-tune</span>
          <button
            type="button"
            onClick={() => selectMinute((selectedMinute + 1) % 60)}
            style={{
              padding: "4px 8px",
              background: "var(--color-bg-overlay)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            +1 min
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        style={{
          width: "100%",
          padding: "8px",
          background: "linear-gradient(135deg, var(--color-primary), #a06030)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: "600",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        OK
      </button>
    </div>
  );
}

export function ReservationsManager() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Search/Check availability form states
  const [searchForm, setSearchForm] = useState(() => {
    const initial = getInitialDateTime();
    return {
      date: initial.date,
      time: initial.time,
      seats: 2,
    };
  });

  const [checking, setChecking] = useState(false);
  const [availableTables, setAvailableTables] = useState<TableData[]>([]);
  const [checked, setChecked] = useState(false);
  const [showClockPicker, setShowClockPicker] = useState(false);

  // Booking details form states
  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    phone: "",
    selectedTableId: "",
  });

  const [booking, setBooking] = useState(false);

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/reservations");
      const data = await res.json();
      if (data.ok) {
        setReservations(data.data || []);
      } else {
        toast.error(data.error || "Failed to load reservations");
      }
    } catch {
      toast.error("Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchForm.date || !searchForm.time || searchForm.seats <= 0) {
      toast.error("Please fill in all search parameters");
      return;
    }

    // Date and time validation: must be in the future
    const reserveTime = new Date(`${searchForm.date}T${searchForm.time}:00`);
    const now = new Date();
    if (reserveTime < now) {
      toast.error("Reservation date and time cannot be in the past.");
      return;
    }

    // Time validation: must be between 10:00 AM and 11:59 PM inclusive (10:00 to 23:59)
    const [hours, minutes] = searchForm.time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    const minMinutes = 10 * 60; // 10:00 AM
    const maxMinutes = 23 * 60 + 59; // 11:59 PM (23:59)
    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      toast.error("Booking time must be between 10:00 and 23:59.");
      return;
    }

    setChecking(true);
    setChecked(false);
    setAvailableTables([]);
    setBookingForm((prev) => ({ ...prev, selectedTableId: "" }));

    try {
      const query = new URLSearchParams({
        check: "true",
        date: searchForm.date,
        time: searchForm.time,
        seats: searchForm.seats.toString(),
      });
      const res = await fetch(`/api/reservations?${query.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setAvailableTables(data.data || []);
        setChecked(true);
        if (data.data.length === 0) {
          toast.error("No suitable tables available for this time slot");
        } else {
          toast.success(`Found ${data.data.length} suitable table(s)`);
        }
      } else {
        toast.error(data.error || "Failed to check table availability");
      }
    } catch {
      toast.error("Failed to check table availability");
    } finally {
      setChecking(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.selectedTableId) {
      toast.error("Please select a table to book");
      return;
    }
    if (!bookingForm.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setBooking(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: bookingForm.customerName,
          phone: bookingForm.phone || null,
          seats: Number(searchForm.seats),
          date: searchForm.date,
          time: searchForm.time,
          tableId: bookingForm.selectedTableId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Reservation booked successfully!");
        setBookingForm({ customerName: "", phone: "", selectedTableId: "" });
        setAvailableTables([]);
        setChecked(false);
        setShowAddForm(false);
        fetchReservations(); // Refresh list
      } else {
        toast.error(data.error || "Failed to book table");
      }
    } catch {
      toast.error("Failed to book table");
    } finally {
      setBooking(false);
    }
  };

  const handleCancelReservation = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Cancel Reservation",
      message: `Are you sure you want to cancel the reservation for ${name}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/reservations/${id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.ok) {
            toast.success("Reservation cancelled successfully");
            setReservations((prev) => prev.filter((r) => r.id !== id));
          } else {
            toast.error(data.error || "Failed to cancel reservation");
          }
        } catch {
          toast.error("Failed to cancel reservation");
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        padding: "28px",
        maxWidth: "1200px",
        margin: "0 auto",
        color: "var(--color-text)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
            <CalendarDays color="var(--color-primary)" size={28} /> Phone Reservations
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              color: "var(--color-text-muted)",
              fontSize: "14px",
            }}
          >
            Find available tables and book call-in reservations for guests.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setChecked(false);
              setAvailableTables([]);
            }}
            style={{
              background: "linear-gradient(135deg, var(--color-primary), #a06030)",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: "600",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(var(--color-primary-rgb),0.3)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Plus size={16} /> New Reservation
          </button>
        )}
      </div>

      {showAddForm && (
        <div
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "32px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              borderBottom: "1px solid var(--color-border-muted)",
              paddingBottom: "12px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles color="var(--color-primary)" size={18} /> Book Table Reservation
            </h2>
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCheckAvailability}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
                alignItems: "flex-end",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "6px",
                  }}
                >
                  Date
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="date"
                    value={searchForm.date}
                    onChange={(e) =>
                      setSearchForm({ ...searchForm, date: e.target.value })
                    }
                    min={getLocalDateString()}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 36px",
                      borderRadius: "8px",
                      background: "var(--color-bg-overlay)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                  <Calendar
                    size={15}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-text-muted)",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "6px",
                  }}
                >
                  Time
                </label>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowClockPicker(!showClockPicker)}
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 36px",
                      borderRadius: "8px",
                      background: "var(--color-bg-overlay)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                      textAlign: "left",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      height: "40px",
                    }}
                  >
                    <Clock
                      size={15}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--color-text-muted)",
                      }}
                    />
                    {searchForm.time}
                  </button>
                  {showClockPicker && (
                    <>
                      <div
                        onClick={() => setShowClockPicker(false)}
                        style={{
                          position: "fixed",
                          inset: 0,
                          zIndex: 99,
                          background: "transparent",
                        }}
                      />
                      <ClockPicker
                        time={searchForm.time}
                        onChange={(newTime) => {
                          setSearchForm({ ...searchForm, time: newTime });
                        }}
                        onClose={() => setShowClockPicker(false)}
                      />
                    </>
                  )}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "6px",
                  }}
                >
                  Number of People
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={searchForm.seats}
                    onChange={(e) =>
                      setSearchForm({
                        ...searchForm,
                        seats: parseInt(e.target.value) || 1,
                      })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 36px",
                      borderRadius: "8px",
                      background: "var(--color-bg-overlay)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                  <Users
                    size={15}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-text-muted)",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={checking}
                style={{
                  background: "var(--color-bg-overlay)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                  padding: "11px 20px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-bg-overlay)")}
              >
                {checking ? "Searching..." : "Check Available Tables"}
                <ArrowRight size={14} />
              </button>
            </div>
          </form>

          {/* Availability Results & Detail Booking Form */}
          {checked && (
            <div style={{ marginTop: "28px", animation: "fadeIn 0.2s ease" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  marginBottom: "12px",
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Available Suitable Tables
              </h3>

              {availableTables.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    background: "rgba(239, 68, 68, 0.05)",
                    border: "1px dashed rgba(239, 68, 68, 0.2)",
                    borderRadius: "12px",
                    color: "#f87171",
                    fontSize: "14px",
                  }}
                >
                  ⚠️ No available tables meet the seat requirement for this date and time window.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "12px",
                    marginBottom: "24px",
                  }}
                >
                  {availableTables.map((table) => {
                    const isSelected = bookingForm.selectedTableId === table.id;
                    return (
                      <div
                        key={table.id}
                        onClick={() =>
                          setBookingForm({ ...bookingForm, selectedTableId: table.id })
                        }
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          background: isSelected
                            ? "rgba(var(--color-primary-rgb), 0.1)"
                            : "var(--color-bg-overlay)",
                          border: isSelected
                            ? "2px solid var(--color-primary)"
                            : "1px solid var(--color-border)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          position: "relative",
                        }}
                      >
                        {isSelected && (
                          <CheckCircle2
                            size={16}
                            color="var(--color-primary)"
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "800",
                            color: isSelected ? "var(--color-primary)" : "var(--color-text)",
                            display: "block",
                          }}
                        >
                          Table {table.tableNumber}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "4px",
                          }}
                        >
                          <MapPin size={11} /> {table.floor.name}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--color-text-faint)",
                            marginTop: "6px",
                            display: "block",
                          }}
                        >
                          Fits {table.seats} Guests
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Book form details */}
              {availableTables.length > 0 && bookingForm.selectedTableId && (
                <form
                  onSubmit={handleCreateBooking}
                  style={{
                    padding: "20px",
                    background: "var(--color-bg-overlay)",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "20px",
                    alignItems: "flex-end",
                    animation: "fadeIn 0.2s ease",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "600",
                        marginBottom: "6px",
                      }}
                    >
                      Customer Name *
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={bookingForm.customerName}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, customerName: e.target.value })
                        }
                        required
                        style={{
                          width: "100%",
                          padding: "10px 12px 10px 36px",
                          borderRadius: "8px",
                          background: "var(--color-bg-elevated)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                      <User
                        size={15}
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--color-text-muted)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "600",
                        marginBottom: "6px",
                      }}
                    >
                      Customer Phone (Optional)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={bookingForm.phone}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, phone: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px 10px 36px",
                          borderRadius: "8px",
                          background: "var(--color-bg-elevated)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                      <Phone
                        size={15}
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--color-text-muted)",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={booking}
                    style={{
                      background: "linear-gradient(135deg, var(--color-primary), #a06030)",
                      color: "#fff",
                      border: "none",
                      padding: "11px 20px",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {booking ? "Booking..." : "Confirm Reservation"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Existing Reservations Table */}
      <div
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid var(--color-border-muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            <ListFilter size={16} color="var(--color-primary)" /> Active Reservations
          </h2>
          <span style={{ fontSize: "12px", color: "var(--color-text-faint)", fontWeight: "600" }}>
            {reservations.length} total
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>
            Loading reservations...
          </div>
        ) : reservations.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "14px" }}>
            No active reservations listed. Click "New Reservation" to add one.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    borderBottom: "1px solid var(--color-border-muted)",
                    color: "var(--color-text-muted)",
                    fontWeight: "600",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "12px 20px" }}>Customer Name</th>
                  <th style={{ padding: "12px 20px" }}>Phone</th>
                  <th style={{ padding: "12px 20px" }}>Guests</th>
                  <th style={{ padding: "12px 20px" }}>Date</th>
                  <th style={{ padding: "12px 20px" }}>Time</th>
                  <th style={{ padding: "12px 20px" }}>Table / Floor</th>
                  <th style={{ padding: "12px 20px", width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => (
                  <tr
                    key={res.id}
                    style={{
                      borderBottom: "1px solid var(--color-border-muted)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.01)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "14px 20px", fontWeight: "600" }}>{res.customerName}</td>
                    <td style={{ padding: "14px 20px", color: "var(--color-text-muted)" }}>{res.phone || "-"}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {res.seats} guests
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", fontWeight: "500" }}>{formatDate(res.reserveTime)}</td>
                    <td style={{ padding: "14px 20px", color: "var(--color-primary)", fontWeight: "600" }}>
                      {formatTime(res.reserveTime)}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontWeight: "600", color: "var(--color-text)" }}>
                        Table {res.table.tableNumber}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          color: "var(--color-text-faint)",
                        }}
                      >
                        {res.table.floor.name}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <button
                        onClick={() => handleCancelReservation(res.id, res.customerName)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          padding: "6px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        title="Cancel Reservation"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <h3
              style={{
                margin: "0 0 10px 0",
                fontSize: "18px",
                fontWeight: "700",
                color: "var(--color-text)",
              }}
            >
              {confirmDialog.title}
            </h3>
            <p
              style={{
                margin: "0 0 24px 0",
                fontSize: "14px",
                color: "var(--color-text-muted)",
                lineHeight: "1.5",
              }}
            >
              {confirmDialog.message}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: "10px 16px",
                  background: "var(--color-bg-overlay)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg-overlay)")}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                style={{
                  padding: "10px 16px",
                  background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
