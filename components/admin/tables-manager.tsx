"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, QrCode, Download, Trash2, Edit, Check, X, Users, Layers, Move } from "lucide-react";
import toast from "react-hot-toast";

interface Floor {
  id: string;
  name: string;
  gridWidth: number; // grid columns count
  gridHeight: number; // grid rows count
  sortOrder: number;
}

interface Table {
  id: string;
  tableNumber: string;
  seats: number;
  isActive: boolean;
  floorId: string;
  qrToken: string | null;
  qrGeneratedAt: string | null;
  floor: { id: string; name: string; gridWidth: number; gridHeight: number };
  orders: { id: string; status: string }[];
  x: number; // grid column
  y: number; // grid row
  width: number; // grid columns span
  height: number; // grid rows span
  status: string; // "AVAILABLE" | "OCCUPIED" | "RESERVED"
}

export function TablesManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<{ url: string; imgUrl: string; tableNumber: string } | null>(null);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [floorForm, setFloorForm] = useState({ name: "", gridWidth: 12, gridHeight: 8 });
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [editForm, setEditForm] = useState({ tableNumber: "", seats: 4, status: "AVAILABLE" });

  useEffect(() => {
    Promise.all([
      fetch("/api/tables").then((r) => r.json()),
      fetch("/api/floors").then((r) => r.json()),
    ]).then(([t, f]) => {
      setTables(t.data || []);
      const fData = f.data || [];
      setFloors(fData);
      if (fData.length > 0) {
        setSelectedFloorId(fData[0].id);
      }
      setLoading(false);
    });
  }, []);

  // Helper: check collision in grid cells coordinates
  const checkCollision = (
    tableId: string | null,
    x: number,
    y: number,
    w: number,
    h: number,
    floorId: string
  ) => {
    const floor = floors.find((f) => f.id === floorId);
    if (!floor) return true;

    // Boundary check
    if (x < 0 || y < 0 || x + w > floor.gridWidth || y + h > floor.gridHeight) {
      return true;
    }

    // Overlap check
    const floorTables = tables.filter((t) => t.floorId === floorId && t.isActive && t.id !== tableId);
    for (const t of floorTables) {
      if (
        x < t.x + t.width &&
        x + w > t.x &&
        y < t.y + t.height &&
        y + h > t.y
      ) {
        return true;
      }
    }
    return false;
  };

  // Helper: sequential T-number generation
  const getNextTableNumber = (floorTables: Table[]) => {
    let maxNum = 0;
    floorTables.forEach((t) => {
      const match = t.tableNumber.match(/^T(\d+)$/i);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    });
    return maxNum + 1;
  };

  // Create Floor
  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floorForm.name.trim()) return;

    try {
      const res = await fetch("/api/floors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(floorForm),
      });
      const data = await res.json();
      if (data.ok) {
        setFloors((prev) => [...prev, data.data]);
        setSelectedFloorId(data.data.id);
        setShowAddFloor(false);
        setFloorForm({ name: "", gridWidth: 12, gridHeight: 8 });
        toast.success("Floor added successfully!");
      } else {
        toast.error(data.error || "Failed to create floor");
      }
    } catch {
      toast.error("Failed to create floor");
    }
  };

  // HTML5 Drag Start (Template & Existing)
  const handleDragStart = (e: React.DragEvent, data: any) => {
    e.dataTransfer.setData("application/json", JSON.stringify(data));
  };

  const handleCellDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Drop on Cell
  const handleCellDrop = async (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    if (!selectedFloorId) return;

    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const dragData = JSON.parse(dataStr);

      if (dragData.type === "template") {
        const { seats, w, h } = dragData;
        
        // Collision check
        if (checkCollision(null, x, y, w, h, selectedFloorId)) {
          toast.error("Placement overlaps another table or goes out of bounds!");
          return;
        }

        const floorTables = tables.filter((t) => t.floorId === selectedFloorId);
        const nextNum = getNextTableNumber(floorTables);
        const tableNumber = `T${nextNum}`;

        const res = await fetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableNumber,
            seats,
            floorId: selectedFloorId,
            x,
            y,
            width: w,
            height: h,
            status: "AVAILABLE",
          }),
        });

        const respData = await res.json();
        if (respData.ok) {
          setTables((prev) => [...prev, respData.data]);
          toast.success(`Table ${tableNumber} created!`);
        } else {
          toast.error(respData.error || "Failed to create table");
        }
      } else if (dragData.type === "existing") {
        const { tableId } = dragData;
        const targetTable = tables.find((t) => t.id === tableId);
        if (!targetTable) return;

        // Collision check
        if (checkCollision(tableId, x, y, targetTable.width, targetTable.height, selectedFloorId)) {
          toast.error("Cannot move table: overlap or out of bounds!");
          return;
        }

        // Optimistic update
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, x, y } : t))
        );

        const res = await fetch(`/api/tables/${tableId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y }),
        });
        const respData = await res.json();
        if (!respData.ok) {
          toast.error(respData.error || "Failed to save table position");
          fetch("/api/tables").then((r) => r.json()).then((t) => setTables(t.data || []));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to place table");
    }
  };

  // Resize Handler
  const handleResizeMouseDown = (e: React.MouseEvent, table: Table) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = table.width;
    const startH = table.height;
    const tableX = table.x;
    const tableY = table.y;
    const tableId = table.id;
    const floorId = table.floorId;

    const gridElement = document.getElementById(`floor-grid-${floorId}`);
    if (!gridElement) return;

    const rect = gridElement.getBoundingClientRect();
    const floor = floors.find((f) => f.id === floorId);
    if (!floor) return;

    const cellWidth = rect.width / floor.gridWidth;
    const cellHeight = rect.height / floor.gridHeight;

    let lastW = startW;
    let lastH = startH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const calculatedW = Math.max(1, Math.round(startW + deltaX / cellWidth));
      const calculatedH = Math.max(1, Math.round(startH + deltaY / cellHeight));

      if (calculatedW !== lastW || calculatedH !== lastH) {
        if (!checkCollision(tableId, tableX, tableY, calculatedW, calculatedH, floorId)) {
          lastW = calculatedW;
          lastH = calculatedH;
          setTables((prev) =>
            prev.map((t) => (t.id === tableId ? { ...t, width: calculatedW, height: calculatedH } : t))
          );
        }
      }
    };

    const handleMouseUp = async () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      const res = await fetch(`/api/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ width: lastW, height: lastH }),
      });
      const respData = await res.json();
      if (respData.ok) {
        toast.success(`Table resized to ${lastW}x${lastH} cells`);
      } else {
        toast.error(respData.error || "Failed to save table size");
        fetch("/api/tables").then((r) => r.json()).then((t) => setTables(t.data || []));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // QR Code generation
  const generateQR = async (tableId: string, tableNumber: string) => {
    setGeneratingQR(tableId);
    try {
      const res = await fetch(`/api/tables/${tableId}/qr`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setQrResult({ url: data.data.qrUrl, imgUrl: data.data.qrImageUrl, tableNumber });
        setTables((prev) =>
          prev.map((t) =>
            t.id === tableId
              ? { ...t, qrToken: data.data.token, qrGeneratedAt: new Date().toISOString() }
              : t
          )
        );
        toast.success("QR code generated!");
      } else {
        toast.error("Failed to generate QR code");
      }
    } catch {
      toast.error("Failed to generate QR code");
    } finally {
      setGeneratingQR(null);
    }
  };

  // Edit table settings save
  const saveTableEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    try {
      const res = await fetch(`/api/tables/${selectedTable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: editForm.tableNumber,
          seats: editForm.seats,
          status: editForm.status,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTables((prev) =>
          prev.map((t) =>
            t.id === selectedTable.id
              ? { ...t, tableNumber: editForm.tableNumber, seats: editForm.seats, status: editForm.status }
              : t
          )
        );
        setSelectedTable(null);
        toast.success("Table settings updated!");
      } else {
        toast.error(data.error || "Failed to update table");
      }
    } catch {
      toast.error("Failed to update table");
    }
  };

  // Deactivate/Delete table
  const deactivateTable = async (id: string) => {
    if (!confirm("Are you sure you want to remove this table?")) return;
    try {
      const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setTables((prev) => prev.filter((t) => t.id !== id));
        setSelectedTable(null);
        toast.success("Table removed from layout.");
      } else {
        toast.error(data.error || "Failed to remove table");
      }
    } catch {
      toast.error("Failed to remove table");
    }
  };

  const selectedFloor = floors.find((f) => f.id === selectedFloorId);
  const floorTables = tables.filter((t) => t.floorId === selectedFloorId && t.isActive);

  // Render seats visually around the tables absolutely
  const renderChairsAroundTable = (seats: number, statusColor: string) => {
    const chairs = [];
    const radius = 6; // chair dot radius
    
    if (seats <= 2) {
      chairs.push(
        <div key="L" style={{ position: "absolute", left: `-${radius * 1.5}px`, top: `calc(50% - ${radius}px)`, width: `${radius*2}px`, height: `${radius*2}px`, borderRadius: "50%", background: statusColor }} />
      );
      chairs.push(
        <div key="R" style={{ position: "absolute", right: `-${radius * 1.5}px`, top: `calc(50% - ${radius}px)`, width: `${radius*2}px`, height: `${radius*2}px`, borderRadius: "50%", background: statusColor }} />
      );
    } else if (seats <= 4) {
      chairs.push(
        <div key="L" style={{ position: "absolute", left: `-${radius * 1.5}px`, top: `calc(50% - ${radius}px)`, width: `${radius*2}px`, height: `${radius*2}px`, borderRadius: "50%", background: statusColor }} />
      );
      chairs.push(
        <div key="R" style={{ position: "absolute", right: `-${radius * 1.5}px`, top: `calc(50% - ${radius}px)`, width: `${radius*2}px`, height: `${radius*2}px`, borderRadius: "50%", background: statusColor }} />
      );
      chairs.push(
        <div key="T" style={{ position: "absolute", top: `-${radius * 1.5}px`, left: `calc(50% - ${radius}px)`, width: `${radius*2}px`, height: `${radius*2}px`, borderRadius: "50%", background: statusColor }} />
      );
      chairs.push(
        <div key="B" style={{ position: "absolute", bottom: `-${radius * 1.5}px`, left: `calc(50% - ${radius}px)`, width: `${radius*2}px`, height: `${radius*2}px`, borderRadius: "50%", background: statusColor }} />
      );
    } else {
      const sideCount = Math.ceil(seats / 2);
      for (let i = 0; i < sideCount; i++) {
        const offsetPct = ((i + 1) / (sideCount + 1)) * 100;
        chairs.push(
          <div key={`T-${i}`} style={{ position: "absolute", top: `-${radius * 1.5}px`, left: `calc(${offsetPct}% - ${radius}px)`, width: `${radius*2}px`, height: `${radius*2}px`, borderRadius: "50%", background: statusColor }} />
        );
        chairs.push(
          <div key={`B-${i}`} style={{ position: "absolute", bottom: `-${radius * 1.5}px`, left: `calc(${offsetPct}% - ${radius}px)`, width: `${radius*2}px`, height: `${radius*2}px`, borderRadius: "50%", background: statusColor }} />
        );
      }
    }
    return chairs;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", color: "var(--color-text-muted)" }}>
        Loading Layout Editor...
      </div>
    );
  }

  return (
    <div style={{ padding: "28px", maxWidth: "1600px", margin: "0 auto", color: "var(--color-text)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800" }}>
            Floor & Table Layout Editor
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
            Design floor plans using grid snapping, drag tables onto the grid, and configure layout sizes.
          </p>
        </div>
        <button
          onClick={() => setShowAddFloor(true)}
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
          <Plus size={16} /> Add Floor
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px" }}>
        
        {/* === LEFT PALETTE COLUMN === */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Floor selector */}
          <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={15} color="var(--color-primary)" /> Floor Plan Views
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {floors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFloorId(f.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    textAlign: "left",
                    fontWeight: "600",
                    border: selectedFloorId === f.id ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                    background: selectedFloorId === f.id ? "rgba(var(--color-primary-rgb),0.1)" : "var(--color-bg-overlay)",
                    color: selectedFloorId === f.id ? "var(--color-primary)" : "var(--color-text-muted)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "13px",
                  }}
                >
                  <span>{f.name}</span>
                  <span style={{ fontSize: "10px", opacity: 0.7 }}>
                    {f.gridWidth}x{f.gridHeight} grid
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Templates */}
          <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700" }}>
              Templates
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: "11px", color: "var(--color-text-muted)" }}>
              Drag templates onto the grid cells on the right.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Template: 2 Seats */}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, { type: "template", seats: 2, w: 1, h: 1 })}
                style={{
                  padding: "12px",
                  background: "var(--color-bg-overlay)",
                  border: "2px dashed var(--color-border)",
                  borderRadius: "10px",
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--color-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "13px" }}>2-Seats Square</div>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>Size: 1x1 Cell</div>
                </div>
                <div style={{ width: "28px", height: "28px", background: "var(--color-primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "11px" }}>
                  2P
                </div>
              </div>

              {/* Template: 4 Seats */}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, { type: "template", seats: 4, w: 2, h: 2 })}
                style={{
                  padding: "12px",
                  background: "var(--color-bg-overlay)",
                  border: "2px dashed var(--color-border)",
                  borderRadius: "10px",
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--color-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "13px" }}>4-Seats Square</div>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>Size: 2x2 Cells</div>
                </div>
                <div style={{ width: "32px", height: "32px", background: "var(--color-primary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "12px" }}>
                  4P
                </div>
              </div>

              {/* Template: 6 Seats */}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, { type: "template", seats: 6, w: 3, h: 2 })}
                style={{
                  padding: "12px",
                  background: "var(--color-bg-overlay)",
                  border: "2px dashed var(--color-border)",
                  borderRadius: "10px",
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--color-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "13px" }}>6-Seats Rectangle</div>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>Size: 3x2 Cells</div>
                </div>
                <div style={{ width: "40px", height: "28px", background: "var(--color-primary)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "12px" }}>
                  6P
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN: Layout Map Grid === */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {selectedFloor ? (
            <div
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "20px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
                    🏗️ {selectedFloor.name} Map Layout
                  </h2>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                    Grid Dimensions: {selectedFloor.gridWidth} Columns x {selectedFloor.gridHeight} Rows
                  </span>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "13px", fontWeight: "600" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }}></span>
                    Available
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }}></span>
                    Occupied
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }}></span>
                    Reserved
                  </div>
                </div>
              </div>

              {/* Grid Canvas Wrapper */}
              <div
                style={{
                  width: "100%",
                  background: "#0b0f19",
                  border: "2px solid var(--color-border)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "inset 0 4px 20px rgba(0,0,0,0.5)",
                  padding: "16px",
                }}
              >
                {/* CSS Grid Editor Container */}
                <div
                  id={`floor-grid-${selectedFloorId}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${selectedFloor.gridWidth}, 1fr)`,
                    gridTemplateRows: `repeat(${selectedFloor.gridHeight}, 1fr)`,
                    gap: "8px",
                    width: "100%",
                    aspectRatio: `${selectedFloor.gridWidth} / ${selectedFloor.gridHeight}`,
                    background: "#0f172a", // slate 900
                    borderRadius: "12px",
                    padding: "8px",
                    position: "relative",
                  }}
                >
                  {/* Grid cells guides backdrop & dropzones */}
                  {Array.from({ length: selectedFloor.gridHeight }).map((_, r) =>
                    Array.from({ length: selectedFloor.gridWidth }).map((_, c) => (
                      <div
                        key={`${r}-${c}`}
                        onDragOver={handleCellDragOver}
                        onDrop={(e) => handleCellDrop(e, c, r)}
                        style={{
                          background: "rgba(255, 255, 255, 0.015)",
                          border: "1px dashed rgba(255, 255, 255, 0.04)",
                          borderRadius: "6px",
                          gridColumnStart: c + 1,
                          gridRowStart: r + 1,
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(var(--color-primary-rgb), 0.04)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.015)"}
                      />
                    ))
                  )}

                  {/* Render Tables */}
                  {floorTables.map((table) => {
                    const hasActiveOrder = table.orders && table.orders.length > 0;
                    
                    let statusColor = "#10b981"; // green
                    let statusBg = "rgba(16, 185, 129, 0.12)";
                    let statusGlow = "0 0 10px rgba(16, 185, 129, 0.4)";
                    let borderHighlight = "1.5px solid #10b981";

                    if (hasActiveOrder || table.status === "OCCUPIED") {
                      statusColor = "#ef4444"; // red
                      statusBg = "rgba(239, 68, 68, 0.12)";
                      statusGlow = "0 0 10px rgba(239, 68, 68, 0.4)";
                      borderHighlight = "1.5px solid #ef4444";
                    } else if (table.status === "RESERVED") {
                      statusColor = "#f59e0b"; // amber
                      statusBg = "rgba(245, 158, 11, 0.12)";
                      statusGlow = "0 0 10px rgba(245, 158, 11, 0.4)";
                      borderHighlight = "1.5px solid #f59e0b";
                    }

                    return (
                      <div
                        key={table.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, { type: "existing", tableId: table.id })}
                        onClick={() => {
                          setSelectedTable(table);
                          setEditForm({
                            tableNumber: table.tableNumber,
                            seats: table.seats,
                            status: table.status,
                          });
                        }}
                        style={{
                          gridColumn: `${table.x + 1} / span ${table.width}`,
                          gridRow: `${table.y + 1} / span ${table.height}`,
                          background: "#1e293b", // slate 800
                          border: borderHighlight,
                          boxShadow: `${statusGlow}, 0 4px 8px rgba(0,0,0,0.3)`,
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          cursor: "grab",
                          position: "relative",
                          padding: "6px",
                          userSelect: "none",
                        }}
                      >
                        {/* Chairs Distributed outside the table */}
                        {renderChairsAroundTable(table.seats, statusColor)}

                        {/* Top-Right Resize Handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, table)}
                          style={{
                            position: "absolute",
                            top: "-5px",
                            right: "-5px",
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            background: "var(--color-primary)",
                            border: "2px solid #fff",
                            cursor: "ne-resize",
                            zIndex: 100,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                          }}
                        />

                        {/* Move Indicator Icon */}
                        <div style={{ position: "absolute", top: "6px", left: "6px", opacity: 0.4 }}>
                          <Move size={9} color="#94a3b8" />
                        </div>

                        {/* Label */}
                        <span style={{ fontSize: "15px", fontWeight: "800", color: "var(--color-primary)" }}>
                          {table.tableNumber}
                        </span>

                        {/* Status tag */}
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: "800",
                            padding: "2px 6px",
                            borderRadius: "999px",
                            color: statusColor,
                            background: statusBg,
                          }}
                        >
                          {hasActiveOrder || table.status === "OCCUPIED" ? "Occupied" : table.status === "RESERVED" ? "Reserved" : "Free"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Canvas Help tips */}
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "flex", gap: "16px", marginTop: "2px" }}>
                <span>💡 Drag templates or tables onto grid cell locations to place them</span>
                <span>📏 Grab and drag the top-right corner handle of any table to Resize</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "16px", color: "var(--color-text-muted)" }}>
              No floor plan view loaded. Please select or add a floor plan.
            </div>
          )}
        </div>
      </div>

      {/* ============================== MODALS & POPUPS ============================== */}

      {/* Add Floor Modal */}
      {showAddFloor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "20px", padding: "28px", maxWidth: "420px", width: "100%", animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "700" }}>Create Restaurant Floor</h3>
              <button onClick={() => setShowAddFloor(false)} style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddFloor} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Floor Plan Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor, Terrace, garden patio"
                  value={floorForm.name}
                  onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Grid Width (Columns) *</label>
                  <input
                    type="number"
                    min="4"
                    max="30"
                    value={floorForm.gridWidth}
                    onChange={(e) => setFloorForm({ ...floorForm, gridWidth: parseInt(e.target.value) || 12 })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--color-bg-overlay)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Grid Height (Rows) *</label>
                  <input
                    type="number"
                    min="4"
                    max="30"
                    value={floorForm.gridHeight}
                    onChange={(e) => setFloorForm({ ...floorForm, gridHeight: parseInt(e.target.value) || 8 })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--color-bg-overlay)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowAddFloor(false)} style={{ flex: 1, padding: "12px", background: "var(--color-bg-overlay)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, var(--color-primary), #a06030)", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Create Floor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Table settings Popup */}
      {selectedTable && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "20px", padding: "28px", maxWidth: "440px", width: "100%", animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "800", color: "var(--color-primary)" }}>Configure Table {selectedTable.tableNumber}</h3>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Size: {selectedTable.width}x{selectedTable.height} grid cells</span>
              </div>
              <button onClick={() => setSelectedTable(null)} style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <form onSubmit={saveTableEdit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Table Name/Number</label>
                <input
                  type="text"
                  value={editForm.tableNumber}
                  onChange={(e) => setEditForm({ ...editForm, tableNumber: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Seats Count (Chairs)</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editForm.seats}
                  onChange={(e) => setEditForm({ ...editForm, seats: parseInt(e.target.value) || 2 })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Status Setting</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["AVAILABLE", "RESERVED"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, status })}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: editForm.status === status ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                        background: editForm.status === status ? "rgba(var(--color-primary-rgb),0.08)" : "var(--color-bg-overlay)",
                        color: editForm.status === status ? "var(--color-primary)" : "var(--color-text-muted)",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      {status === "AVAILABLE" ? "🟢 Available" : "🟡 Reserved"}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Generation */}
              <div style={{ background: "var(--color-bg-overlay)", padding: "14px", borderRadius: "10px", border: "1px solid var(--color-border)", display: "flex", gap: "10px", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600" }}>Self-Order QR Code</span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-faint)" }}>
                    {selectedTable.qrToken ? "Active ✅" : "Not Generated ⚠️"}
                  </span>
                </div>
                <button
                  type="button"
                  id={`gen-qr-${selectedTable.id}`}
                  onClick={() => generateQR(selectedTable.id, selectedTable.tableNumber)}
                  disabled={generatingQR === selectedTable.id}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(var(--color-primary-rgb),0.12)",
                    border: "1px solid rgba(var(--color-primary-rgb),0.3)",
                    color: "var(--color-primary)",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <QrCode size={14} />
                  {generatingQR === selectedTable.id ? "Generating..." : selectedTable.qrToken ? "Regenerate QR" : "Generate QR Code"}
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => deactivateTable(selectedTable.id)}
                  style={{
                    padding: "12px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Trash2 size={15} /> Remove
                </button>
                <button type="button" onClick={() => setSelectedTable(null)} style={{ flex: 1, padding: "12px", background: "var(--color-bg-overlay)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, var(--color-primary), #a06030)", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Result popup */}
      {qrResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: "20px" }} onClick={() => setQrResult(null)}>
          <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "20px", padding: "32px", maxWidth: "380px", width: "100%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "800" }}>Table {qrResult.tableNumber} QR</h3>
            <p style={{ margin: "0 0 24px", fontSize: "14px", color: "var(--color-text-muted)" }}>Customers can scan this to order directly from their table.</p>

            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", display: "inline-block", marginBottom: "20px" }}>
              <img src={qrResult.imgUrl} alt={`QR for ${qrResult.tableNumber}`} width={200} height={200} style={{ display: "block" }} />
            </div>

            <p style={{ fontSize: "12px", color: "var(--color-text-faint)", marginBottom: "20px", wordBreak: "break-all" }}>{qrResult.url}</p>

            <div style={{ display: "flex", gap: "10px" }}>
              <a
                href={qrResult.imgUrl}
                download={`table-${qrResult.tableNumber}-qr.png`}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, var(--color-primary), #a06030)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Download size={15} /> Download
              </a>
              <button onClick={() => setQrResult(null)} style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "var(--color-bg-overlay)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
