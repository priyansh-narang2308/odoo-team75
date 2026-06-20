import { redirect } from "next/navigation";
import { verifyQRToken } from "@/lib/qr";
import { prisma } from "@/lib/prisma";
import { CustomerOrderGate } from "@/components/customer/customer-order-gate";

interface PageProps {
  params: Promise<{ tableToken: string }>;
}

export default async function CustomerOrderPage({ params }: PageProps) {
  const { tableToken } = await params;

  // Verify QR token
  let tableId: string;
  let tableNumber: string;

  try {
    const payload = await verifyQRToken(tableToken);
    if (!payload) throw new Error("null");
    tableId = payload.tableId;
    tableNumber = payload.tableNumber;
  } catch {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f13",
          color: "#fff",
          flexDirection: "column",
          gap: "12px",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <span style={{ fontSize: "48px" }}>❌</span>
        <h1 style={{ fontSize: "22px", fontWeight: "700" }}>Invalid QR Code</h1>
        <p style={{ color: "#8a8a9a", fontSize: "14px" }}>
          This QR code is invalid or has expired. Please scan the QR code on your table again.
        </p>
      </div>
    );
  }

  // Verify table is active
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: { floor: { select: { name: true } } },
  });

  if (!table || !table.isActive) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f13", color: "#fff", flexDirection: "column", gap: "12px", textAlign: "center", padding: "20px" }}>
        <span style={{ fontSize: "48px" }}>🪑</span>
        <h1 style={{ fontSize: "22px", fontWeight: "700" }}>Table Unavailable</h1>
        <p style={{ color: "#8a8a9a", fontSize: "14px" }}>This table is currently unavailable. Please ask a staff member for help.</p>
      </div>
    );
  }

  return (
    <CustomerOrderGate
      tableId={tableId}
      tableToken={tableToken}
      tableNumber={table.tableNumber}
      floorName={table.floor.name}
    />
  );
}
