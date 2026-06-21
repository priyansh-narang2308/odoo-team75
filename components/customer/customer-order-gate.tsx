"use client";

import { CustomerMenu } from "./customer-menu";

interface Props {
  tableId: string;
  tableToken: string;
  tableNumber: string;
  floorName: string;
}

export function CustomerOrderGate({
  tableId,
  tableToken,
  tableNumber,
  floorName,
}: Props) {
  // We no longer require an auth screen or splash screen.
  // The QR token natively authorizes the table. We mock a dummy customer session to satisfy the CustomerMenu prop.
  const dummySession = {
    id: "anonymous",
    name: `Table ${tableNumber}`,
    email: "",
    tableId: tableId,
  };

  return (
    <CustomerMenu
      tableId={tableId}
      tableNumber={tableNumber}
      floorName={floorName}
      customer={dummySession}
      onLogout={() => {}}
    />
  );
}
