/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  QrCode,
  Download,
  Trash2,
  X,
  Layers,
  Move,
  Printer,
  Link,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

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
  reservations?: { id: string; reserveTime: string }[];
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
  const [qrResult, setQrResult] = useState<{
    url: string;
    imgUrl: string;
    tableNumber: string;
  } | null>(null);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [floorForm, setFloorForm] = useState({
    name: "",
    gridWidth: 12,
    gridHeight: 8,
  });
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    tableNumber: "",
    seats: 4,
    status: "AVAILABLE",
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmVariant?: "danger" | "primary";
    onConfirm: () => void;
  } | null>(null);
  const [expandedQr, setExpandedQr] = useState<{
    url: string;
    tableNumber: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/tables").then((r) => r.json()),
      fetch("/api/floors").then((r) => r.json()),
    ]).then(([t, f]) => {
      const tablesData = t.data || [];
      setTables(tablesData);
      const fData = f.data || [];
      setFloors(fData);
      if (fData.length > 0) {
        setSelectedFloorId(fData[0].id);
      }
      setLoading(false);

      // Concurrent auto-generation of missing QR codes on load
      const missing = tablesData.filter(
        (tab: Table) => tab.isActive && !tab.qrToken,
      );
      if (missing.length > 0) {
        Promise.all(
          missing.map(async (tab: Table) => {
            try {
              const res = await fetch(`/api/tables/${tab.id}/qr`, {
                method: "POST",
              });
              const resJson = await res.json();
              if (resJson.ok) {
                setTables((prev) =>
                  prev.map((item) =>
                    item.id === tab.id
                      ? {
                          ...item,
                          qrToken: resJson.data.token,
                          qrGeneratedAt: new Date().toISOString(),
                        }
                      : item,
                  ),
                );
              }
            } catch (err) {
              console.error(
                `Failed to auto-generate QR for table ${tab.tableNumber}:`,
                err,
              );
            }
          }),
        );
      }
    });
  }, []);

  // Helper: check collision in grid cells coordinates
  const checkCollision = (
    tableId: string | null,
    x: number,
    y: number,
    w: number,
    h: number,
    floorId: string,
  ) => {
    const floor = floors.find((f) => f.id === floorId);
    if (!floor) return true;

    // Boundary check
    if (x < 0 || y < 0 || x + w > floor.gridWidth || y + h > floor.gridHeight) {
      return true;
    }

    // Overlap check
    const floorTables = tables.filter(
      (t) => t.floorId === floorId && t.isActive && t.id !== tableId,
    );
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
    const existingNums = new Set<number>();
    floorTables.forEach((t) => {
      const match = t.tableNumber.match(/^T(\d+)$/i);
      if (match) {
        existingNums.add(parseInt(match[1]));
      }
    });
    let candidate = 1;
    while (existingNums.has(candidate)) {
      candidate++;
    }
    return candidate;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          toast.error(
            "Placement overlaps another table or goes out of bounds!",
          );
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
        if (
          checkCollision(
            tableId,
            x,
            y,
            targetTable.width,
            targetTable.height,
            selectedFloorId,
          )
        ) {
          toast.error("Cannot move table: overlap or out of bounds!");
          return;
        }

        // Optimistic update
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, x, y } : t)),
        );

        const res = await fetch(`/api/tables/${tableId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y }),
        });
        const respData = await res.json();
        if (!respData.ok) {
          toast.error(respData.error || "Failed to save table position");
          fetch("/api/tables")
            .then((r) => r.json())
            .then((t) => setTables(t.data || []));
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
        if (
          !checkCollision(
            tableId,
            tableX,
            tableY,
            calculatedW,
            calculatedH,
            floorId,
          )
        ) {
          lastW = calculatedW;
          lastH = calculatedH;
          setTables((prev) =>
            prev.map((t) =>
              t.id === tableId
                ? { ...t, width: calculatedW, height: calculatedH }
                : t,
            ),
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
        fetch("/api/tables")
          .then((r) => r.json())
          .then((t) => setTables(t.data || []));
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
        setQrResult({
          url: data.data.qrUrl,
          imgUrl: data.data.qrImageUrl,
          tableNumber,
        });
        setTables((prev) =>
          prev.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  qrToken: data.data.token,
                  qrGeneratedAt: new Date().toISOString(),
                }
              : t,
          ),
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

  // Export PDF of all QRs for current floor (4 per page)
  const handleExportPDF = () => {
    if (!selectedFloor) return;
    const activeTables = tables.filter(
      (t) => t.floorId === selectedFloor.id && t.isActive,
    );
    if (activeTables.length === 0) {
      toast.error("No tables in layout to export!");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      let content = "";
      const sortedTables = activeTables.sort((a, b) =>
        a.tableNumber.localeCompare(b.tableNumber, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

      for (let i = 0; i < sortedTables.length; i += 4) {
        const chunk = sortedTables.slice(i, i + 4);
        content += `<div class="page"><div class="grid">`;
        chunk.forEach((table) => {
          const qrUrl = `/qrcodes/table-${table.tableNumber.replace(/\\s+/g, "-")}-${table.id}.png`;
          content += `
            <div class="qr-card">
              <h1>Table ${table.tableNumber}</h1>
              <p>Scan to Order & Pay</p>
              <img src="${qrUrl}" alt="QR Code" />
              <div class="footer">CafePOS Self-Ordering System</div>
            </div>
          `;
        });
        content += `</div></div>`;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Export PDF QRs - ${selectedFloor.name}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                background-color: white;
                color: black;
              }
              .page {
                page-break-after: always;
                height: 100vh;
                box-sizing: border-box;
                padding: 40px;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              .page:last-child {
                page-break-after: avoid;
              }
              .grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(2, 1fr);
                gap: 40px;
                height: 100%;
              }
              .qr-card {
                text-align: center;
                border: 2px dashed #c87941;
                border-radius: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: #fafafa;
                padding: 20px;
                box-sizing: border-box;
              }
              h1 {
                font-size: 32px;
                margin: 0 0 8px 0;
                color: #1a0a00;
                font-weight: 800;
              }
              p {
                font-size: 16px;
                color: #c87941;
                margin: 0 0 25px 0;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              img {
                width: 220px;
                height: 220px;
                object-fit: contain;
                border: 1px solid #eaeaea;
                padding: 8px;
                border-radius: 12px;
                background: white;
              }
              .footer {
                margin-top: 25px;
                font-size: 12px;
                color: #888;
                font-weight: 500;
              }
              @media print {
                body {
                  padding: 0;
                  margin: 0;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .page {
                  padding: 20px;
                }
                .qr-card {
                  border: 2px solid #eaeaea;
                  background: white;
                }
              }
            </style>
          </head>
          <body>
            ${content}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
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
              ? {
                  ...t,
                  tableNumber: editForm.tableNumber,
                  seats: editForm.seats,
                  status: editForm.status,
                }
              : t,
          ),
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

  // Clear layout of active floor
  const handleClearFloorLayout = async () => {
    if (!selectedFloorId) return;
    setConfirmDialog({
      isOpen: true,
      title: "Clear Floor Layout",
      message:
        "Are you sure you want to clear all tables on this floor layout? This cannot be undone.",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tables?floorId=${selectedFloorId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.ok) {
            setTables((prev) =>
              prev.filter((t) => t.floorId !== selectedFloorId),
            );
            toast.success("Floor layout cleared successfully!");
          } else {
            toast.error(data.error || "Failed to clear floor layout");
          }
        } catch {
          toast.error("Failed to clear floor layout");
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const deactivateTable = (id: string) => {
    setDeleteTableId(id);
  };

  const selectedFloor = floors.find((f) => f.id === selectedFloorId);
  const floorTables = tables.filter(
    (t) => t.floorId === selectedFloorId && t.isActive,
  );

  // Render seats visually around the tables absolutely
  const renderChairsAroundTable = (seats: number, statusColor: string) => {
    const chairs = [];
    const radius = 6; // chair dot radius

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

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
          color: "var(--color-text-muted)",
        }}
      >
        Loading Layout Editor...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "28px",
        maxWidth: "1600px",
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
          marginBottom: "20px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800" }}>
            Floor & Table Layout Editor
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              color: "var(--color-text-muted)",
              fontSize: "14px",
            }}
          >
            Design floor plans using grid snapping, drag tables onto the grid,
            and configure layout sizes.
          </p>
        </div>
        <button
          onClick={() => setShowAddFloor(true)}
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary), #a06030)",
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: "24px",
        }}
      >
        {/* === LEFT PALETTE COLUMN === */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Floor selector */}
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              padding: "18px",
            }}
          >
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: "15px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Layers size={15} color="var(--color-primary)" /> Floor Plan Views
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {floors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFloorId(f.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    textAlign: "left",
                    fontWeight: "600",
                    border:
                      selectedFloorId === f.id
                        ? "2px solid var(--color-primary)"
                        : "1px solid var(--color-border)",
                    background:
                      selectedFloorId === f.id
                        ? "rgba(var(--color-primary-rgb),0.1)"
                        : "var(--color-bg-overlay)",
                    color:
                      selectedFloorId === f.id
                        ? "var(--color-primary)"
                        : "var(--color-text-muted)",
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
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              padding: "18px",
            }}
          >
            <h3
              style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700" }}
            >
              Templates
            </h3>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: "11px",
                color: "var(--color-text-muted)",
              }}
            >
              Drag templates onto the grid cells on the right.
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {/* Template: 2 Seats */}
              <div
                draggable
                onDragStart={(e) =>
                  handleDragStart(e, { type: "template", seats: 2, w: 1, h: 1 })
                }
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-border)")
                }
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "13px" }}>
                    2-Seats Square
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--color-text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    Size: 1x1 Cell
                  </div>
                </div>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "var(--color-primary)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "11px",
                  }}
                >
                  2P
                </div>
              </div>

              {/* Template: 4 Seats */}
              <div
                draggable
                onDragStart={(e) =>
                  handleDragStart(e, { type: "template", seats: 4, w: 2, h: 2 })
                }
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-border)")
                }
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "13px" }}>
                    4-Seats Square
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--color-text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    Size: 2x2 Cells
                  </div>
                </div>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    background: "var(--color-primary)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                >
                  4P
                </div>
              </div>

              {/* Template: 6 Seats */}
              <div
                draggable
                onDragStart={(e) =>
                  handleDragStart(e, { type: "template", seats: 6, w: 3, h: 2 })
                }
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-border)")
                }
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "13px" }}>
                    6-Seats Rectangle
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--color-text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    Size: 3x2 Cells
                  </div>
                </div>
                <div
                  style={{
                    width: "40px",
                    height: "28px",
                    background: "var(--color-primary)",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                >
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "16px" }}
                >
                  <div>
                    <h2
                      style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}
                    >
                      🏗️ {selectedFloor.name} Map Layout
                    </h2>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Grid Dimensions: {selectedFloor.gridWidth} Columns x{" "}
                      {selectedFloor.gridHeight} Rows
                    </span>
                  </div>
                  <button
                    onClick={handleClearFloorLayout}
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(239, 68, 68, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(239, 68, 68, 0.1)";
                    }}
                  >
                    <Trash2 size={13} /> Clear Layout
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    fontSize: "13px",
                    fontWeight: "600",
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
                        width: "10px",
                        height: "10px",
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
                        width: "10px",
                        height: "10px",
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
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#f59e0b",
                      }}
                    ></span>
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
                  {Array.from({ length: selectedFloor.gridHeight }).map(
                    (_, r) =>
                      Array.from({ length: selectedFloor.gridWidth }).map(
                        (_, c) => (
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
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "rgba(var(--color-primary-rgb), 0.04)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "rgba(255, 255, 255, 0.015)")
                            }
                          />
                        ),
                      ),
                  )}

                  {/* Render Tables */}
                  {floorTables.map((table) => {
                    const hasActiveOrder =
                      table.orders && table.orders.length > 0;

                    const isReserved =
                      table.status === "RESERVED" ||
                      (table.reservations && table.reservations.length > 0);

                    let statusColor = "#10b981"; // green
                    let statusBg = "rgba(16, 185, 129, 0.12)";
                    let statusGlow = "0 0 10px rgba(16, 185, 129, 0.4)";
                    let borderHighlight = "1.5px solid #10b981";

                    if (hasActiveOrder || table.status === "OCCUPIED") {
                      statusColor = "#ef4444"; // red
                      statusBg = "rgba(239, 68, 68, 0.12)";
                      statusGlow = "0 0 10px rgba(239, 68, 68, 0.4)";
                      borderHighlight = "1.5px solid #ef4444";
                    } else if (isReserved) {
                      statusColor = "#f59e0b"; // amber
                      statusBg = "rgba(245, 158, 11, 0.12)";
                      statusGlow = "0 0 10px rgba(245, 158, 11, 0.4)";
                      borderHighlight = "1.5px solid #f59e0b";
                    }

                    return (
                      <div
                        key={table.id}
                        draggable
                        onDragStart={(e) =>
                          handleDragStart(e, {
                            type: "existing",
                            tableId: table.id,
                          })
                        }
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
                        <div
                          style={{
                            position: "absolute",
                            top: "6px",
                            left: "6px",
                            opacity: 0.4,
                          }}
                        >
                          <Move size={9} color="#94a3b8" />
                        </div>

                        {/* Label */}
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: "800",
                            color: "var(--color-primary)",
                          }}
                        >
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
                          {hasActiveOrder || table.status === "OCCUPIED"
                            ? "Occupied"
                            : isReserved
                              ? "Reserved"
                              : "Free"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Canvas Help tips */}
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  gap: "16px",
                  marginTop: "2px",
                }}
              >
                <span>
                  💡 Drag templates or tables onto grid cell locations to place
                  them
                </span>
                <span>
                  📏 Grab and drag the top-right corner handle of any table to
                  Resize
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                color: "var(--color-text-muted)",
              }}
            >
              No floor plan view loaded. Please select or add a floor plan.
            </div>
          )}
        </div>
      </div>

      {/* Table QRs Grid Section */}
      {selectedFloor && (
        <div
          style={{
            marginTop: "40px",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          {/* Dynamic style for spin animation */}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              borderBottom: "1px solid var(--color-border-muted)",
              paddingBottom: "16px",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "800",
                  color: "var(--color-text)",
                }}
              >
                Table QR Codes — {selectedFloor.name}
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "var(--color-text-muted)",
                  fontSize: "13px",
                }}
              >
                Scan or print these QR codes for self-ordering at each table.
                Only tables currently placed in the layout are shown.
              </p>
            </div>

            <button
              onClick={handleExportPDF}
              style={{
                background: "rgba(var(--color-primary-rgb), 0.1)",
                border: "1px solid rgba(var(--color-primary-rgb), 0.3)",
                color: "var(--color-primary)",
                padding: "8px 16px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(var(--color-primary-rgb), 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "rgba(var(--color-primary-rgb), 0.1)";
              }}
            >
              <FileText size={15} /> Export PDF (All QRs)
            </button>
          </div>

          {tables.filter((t) => t.floorId === selectedFloor.id && t.isActive)
            .length === 0 ? (
            <div
              style={{
                padding: "32px",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "14px",
              }}
            >
              No tables placed on this floor yet. Drag templates onto the layout
              above to add tables.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "24px",
              }}
            >
              {tables
                .filter((t) => t.floorId === selectedFloor.id && t.isActive)
                .sort((a, b) =>
                  a.tableNumber.localeCompare(b.tableNumber, undefined, {
                    numeric: true,
                    sensitivity: "base",
                  }),
                )
                .map((table) => {
                  const qrUrl = `/qrcodes/table-${table.tableNumber.replace(/\s+/g, "-")}-${table.id}.png`;
                  return (
                    <div
                      key={table.id}
                      style={{
                        background: "rgba(30, 41, 59, 0.4)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(200, 121, 65, 0.15)",
                        borderRadius: "20px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        gap: "16px",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px)";
                        e.currentTarget.style.boxShadow =
                          "0 12px 30px rgba(200, 121, 65, 0.25)";
                        e.currentTarget.style.borderColor =
                          "var(--color-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 15px rgba(0,0,0,0.2)";
                        e.currentTarget.style.borderColor =
                          "rgba(200, 121, 65, 0.15)";
                      }}
                    >
                      {/* Top ribbon decoration */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "4px",
                          background:
                            "linear-gradient(90deg, var(--color-primary), var(--color-primary-hover))",
                        }}
                      />

                      <div
                        style={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <span
                            style={{
                              fontSize: "18px",
                              fontWeight: "900",
                              color: "var(--color-primary)",
                              display: "block",
                              fontFamily: "var(--font-sans)",
                            }}
                          >
                            Table {table.tableNumber}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--color-text-muted)",
                              fontWeight: "500",
                            }}
                          >
                            {table.seats} seats
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "750",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background:
                              table.status === "RESERVED"
                                ? "rgba(245, 158, 11, 0.15)"
                                : table.status === "OCCUPIED"
                                  ? "rgba(239, 68, 68, 0.15)"
                                  : "rgba(16, 185, 129, 0.15)",
                            color:
                              table.status === "RESERVED"
                                ? "#f59e0b"
                                : table.status === "OCCUPIED"
                                  ? "#ef4444"
                                  : "#10b981",
                            border: `1px solid ${table.status === "RESERVED" ? "rgba(245, 158, 11, 0.3)" : table.status === "OCCUPIED" ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                          }}
                        >
                          {table.status}
                        </span>
                      </div>

                      <div
                        style={{
                          width: "150px",
                          height: "150px",
                          background: "#fff",
                          borderRadius: "16px",
                          padding: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
                          position: "relative",
                          border: "2px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        {table.qrToken ? (
                          <img
                            src={qrUrl}
                            alt={`QR Code for Table ${table.tableNumber}`}
                            onClick={() =>
                              setExpandedQr({
                                url: qrUrl,
                                tableNumber: table.tableNumber,
                              })
                            }
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#475569",
                              fontSize: "11px",
                              gap: "8px",
                              padding: "8px",
                            }}
                          >
                            {generatingQR === table.id ? (
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  border: "2px solid #cbd5e1",
                                  borderTopColor: "var(--color-primary)",
                                  borderRadius: "50%",
                                  animation: "spin 1s linear infinite",
                                }}
                              />
                            ) : (
                              <QrCode size={24} color="#64748b" />
                            )}
                            <span>
                              {generatingQR === table.id
                                ? "Generating..."
                                : "No QR Code"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          width: "100%",
                          gap: "8px",
                          marginTop: "4px",
                        }}
                      >
                        {table.qrToken ? (
                          <>
                            <a
                              href={qrUrl}
                              download={`table-${table.tableNumber}-qr.png`}
                              style={{
                                flex: 1,
                                padding: "8px 8px",
                                background:
                                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                                border: "none",
                                color: "#fff",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: "600",
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                boxShadow:
                                  "0 2px 8px rgba(var(--color-primary-rgb), 0.2)",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "0.9";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "1";
                              }}
                            >
                              <Download size={14} /> Download
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/order/${table.qrToken}`,
                                );
                                toast.success("Ordering link copied!");
                              }}
                              style={{
                                padding: "8px 10px",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "var(--color-text)",
                                borderRadius: "10px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                  "rgba(255,255,255,0.12)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "rgba(255,255,255,0.06)";
                              }}
                              title="Copy Ordering Link"
                            >
                              <Link size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                generateQR(table.id, table.tableNumber)
                              }
                              disabled={generatingQR === table.id}
                              style={{
                                padding: "8px 10px",
                                background: "transparent",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "var(--color-text-muted)",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor =
                                  "var(--color-primary)";
                                e.currentTarget.style.color =
                                  "var(--color-primary)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "rgba(255,255,255,0.1)";
                                e.currentTarget.style.color =
                                  "var(--color-text-muted)";
                              }}
                            >
                              {generatingQR === table.id ? "..." : "Regen"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              generateQR(table.id, table.tableNumber)
                            }
                            disabled={generatingQR === table.id}
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              background:
                                "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                              color: "#fff",
                              border: "none",
                              borderRadius: "10px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                            }}
                          >
                            <QrCode size={14} />
                            {generatingQR === table.id
                              ? "Generating..."
                              : "Generate QR"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ============================== MODALS & POPUPS ============================== */}

      {/* Add Floor Modal */}
      {showAddFloor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "420px",
              width: "100%",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "700" }}>
                Create Restaurant Floor
              </h3>
              <button
                onClick={() => setShowAddFloor(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleAddFloor}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
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
                  Floor Plan Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor, Terrace, garden patio"
                  value={floorForm.name}
                  onChange={(e) =>
                    setFloorForm({ ...floorForm, name: e.target.value })
                  }
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

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
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
                    Grid Width (Columns) *
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="30"
                    value={floorForm.gridWidth}
                    onChange={(e) =>
                      setFloorForm({
                        ...floorForm,
                        gridWidth: parseInt(e.target.value) || 12,
                      })
                    }
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
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "600",
                      marginBottom: "6px",
                    }}
                  >
                    Grid Height (Rows) *
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="30"
                    value={floorForm.gridHeight}
                    onChange={(e) =>
                      setFloorForm({
                        ...floorForm,
                        gridHeight: parseInt(e.target.value) || 8,
                      })
                    }
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
                <button
                  type="button"
                  onClick={() => setShowAddFloor(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "12px",
                    background:
                      "linear-gradient(135deg, var(--color-primary), #a06030)",
                    border: "none",
                    color: "#fff",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Create Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Table settings Popup */}
      {selectedTable && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "440px",
              width: "100%",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0",
                    fontSize: "18px",
                    fontWeight: "800",
                    color: "var(--color-primary)",
                  }}
                >
                  Configure Table {selectedTable.tableNumber}
                </h3>
                <span
                  style={{ fontSize: "11px", color: "var(--color-text-muted)" }}
                >
                  Size: {selectedTable.width}x{selectedTable.height} grid cells
                </span>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveTableEdit}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
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
                  Table Name/Number
                </label>
                <input
                  type="text"
                  value={editForm.tableNumber}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tableNumber: e.target.value })
                  }
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
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "6px",
                  }}
                >
                  Seats Count (Chairs)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editForm.seats}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      seats: parseInt(e.target.value) || 2,
                    })
                  }
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

              {/* QR Generation */}
              <div
                style={{
                  background: "var(--color-bg-overlay)",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  gap: "10px",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: "600" }}>
                    Self-Order QR Code
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-faint)",
                    }}
                  >
                    {selectedTable.qrToken ? "Active ✅" : "Not Generated ⚠️"}
                  </span>
                </div>
                <button
                  type="button"
                  id={`gen-qr-${selectedTable.id}`}
                  onClick={() =>
                    generateQR(selectedTable.id, selectedTable.tableNumber)
                  }
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
                  {generatingQR === selectedTable.id
                    ? "Generating..."
                    : selectedTable.qrToken
                      ? "Regenerate QR"
                      : "Generate QR Code"}
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
                <button
                  type="button"
                  onClick={() => setSelectedTable(null)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "12px",
                    background:
                      "linear-gradient(135deg, var(--color-primary), #a06030)",
                    border: "none",
                    color: "#fff",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Save
                </button>
              </div>
            </form>

            {selectedTable.reservations &&
              selectedTable.reservations.length > 0 && (
                <div
                  style={{
                    marginTop: "24px",
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: "18px",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "14px",
                      fontWeight: "800",
                      color: "var(--color-primary)",
                    }}
                  >
                    📅 Active Reservations
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      maxHeight: "180px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {selectedTable.reservations.map((res: any) => {
                      const resDate = new Date(res.reserveTime);
                      return (
                        <div
                          key={res.id}
                          style={{
                            background: "var(--color-bg-overlay)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "10px",
                            padding: "12px",
                            fontSize: "13px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "700",
                              color: "var(--color-text)",
                            }}
                          >
                            Customer: {res.customerName}
                          </div>
                          {res.phone && (
                            <div
                              style={{
                                color: "var(--color-text-muted)",
                                fontSize: "12px",
                              }}
                            >
                              Phone: {res.phone}
                            </div>
                          )}
                          <div
                            style={{
                              color: "var(--color-text-muted)",
                              fontSize: "12px",
                            }}
                          >
                            Guests: {res.seats} seats
                          </div>
                          <div
                            style={{
                              color: "var(--color-primary)",
                              fontWeight: "700",
                              fontSize: "12px",
                            }}
                          >
                            Time: {String(resDate.getHours()).padStart(2, "0")}:
                            {String(resDate.getMinutes()).padStart(2, "0")} (
                            {resDate.toLocaleDateString()})
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* QR Code Result popup */}
      {qrResult && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
            padding: "20px",
          }}
          onClick={() => setQrResult(null)}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "20px",
              padding: "32px",
              maxWidth: "380px",
              width: "100%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "800" }}
            >
              Table {qrResult.tableNumber} QR
            </h3>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: "14px",
                color: "var(--color-text-muted)",
              }}
            >
              Customers can scan this to order directly from their table.
            </p>

            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "8px",
                display: "inline-block",
                marginBottom: "20px",
                overflow: "hidden",
              }}
            >
              <Image
                src={qrResult.imgUrl}
                alt={`QR for ${qrResult.tableNumber}`}
                width={280}
                height={280}
                style={{ display: "block" }}
              />
            </div>

            <p
              style={{
                fontSize: "12px",
                color: "var(--color-text-faint)",
                marginBottom: "20px",
                wordBreak: "break-all",
              }}
            >
              {qrResult.url}
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <a
                href={qrResult.imgUrl}
                download={`table-${qrResult.tableNumber}-qr.png`}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(135deg, var(--color-primary), #a06030)",
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
              <button
                onClick={() => setQrResult(null)}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  background: "var(--color-bg-overlay)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirmation Dialog */}
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
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--color-bg-elevated)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--color-bg-overlay)")
                }
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                style={{
                  padding: "10px 16px",
                  background:
                    confirmDialog.confirmVariant === "danger"
                      ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                      : "linear-gradient(135deg, var(--color-primary), #a06030)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                  boxShadow:
                    confirmDialog.confirmVariant === "danger"
                      ? "0 4px 12px rgba(239, 68, 68, 0.2)"
                      : "0 4px 12px rgba(var(--color-primary-rgb),0.2)",
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

      {/* Expanded QR Code Modal */}
      {expandedQr && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            padding: "20px",
          }}
          onClick={() => setExpandedQr(null)}
        >
          <div
            style={{
              position: "relative",
              background: "var(--color-bg-elevated)",
              borderRadius: "24px",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              border: "1px solid var(--color-border)",
              animation: "fadeIn 0.25s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedQr(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
              }
            >
              <X size={16} />
            </button>
            <h3
              style={{
                margin: "0 0 24px",
                fontSize: "24px",
                fontWeight: "800",
                color: "var(--color-primary)",
              }}
            >
              Table {expandedQr.tableNumber}
            </h3>
            <div
              style={{
                background: "#fff",
                padding: "16px",
                borderRadius: "16px",
              }}
            >
              <img
                src={expandedQr.url}
                alt={`QR for Table ${expandedQr.tableNumber}`}
                style={{
                  width: "300px",
                  height: "300px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
            <a
              href={expandedQr.url}
              download={`table-${expandedQr.tableNumber}-qr.png`}
              style={{
                marginTop: "24px",
                padding: "12px 24px",
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover, #a06030))",
                color: "#fff",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(var(--color-primary-rgb), 0.3)",
                transition: "transform 0.2s, opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.opacity = "1";
              }}
            >
              <Download size={16} /> Download QR Code
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
