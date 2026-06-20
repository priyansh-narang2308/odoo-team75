"use client";

import { useState, useEffect } from "react";
import { CustomerAuth } from "./customer-auth";
import { CustomerMenu } from "./customer-menu";

import Image from "next/image";

interface Props {
  tableId: string;
  tableToken: string;
  tableNumber: string;
  floorName: string;
}

interface CustomerSession {
  id: string;
  name: string;
  email: string;
  tableId: string;
}

export function CustomerOrderGate({ tableId, tableToken, tableNumber, floorName }: Props) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if customer already has a session
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.data.tableId === tableId) {
          setSession(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, [tableId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#241114",
        }}
      >
        <div style={{ textAlign: "center", color: "#E6A8B7", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ marginBottom: "12px" }}>
            <Image src="/CafePOS.png" alt="CafePOS Logo" width={80} height={80} style={{ objectFit: "contain" }} />
          </div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <CustomerAuth
        tableId={tableId}
        tableNumber={tableNumber}
        floorName={floorName}
        onSuccess={setSession}
      />
    );
  }

  return (
    <CustomerMenu
      tableId={tableId}
      tableNumber={tableNumber}
      floorName={floorName}
      customer={session}
      onLogout={() => setSession(null)}
    />
  );
}
