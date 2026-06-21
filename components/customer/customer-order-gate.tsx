"use client";

import { useState } from "react";
import { CustomerMenu } from "./customer-menu";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

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
  const [started, setStarted] = useState(false);

  const dummySession = {
    id: "anonymous",
    name: `Table ${tableNumber}`,
    email: "",
    tableId: tableId,
  };

  if (started) {
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-inter), sans-serif",
      padding: "20px",
      textAlign: "center"
    }}>
      <div style={{
        background: "#ffffff",
        padding: "40px",
        borderRadius: "24px",
        boxShadow: "0 20px 40px rgba(147, 51, 234, 0.1)",
        maxWidth: "400px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        {/* Generated Image */}
        <div style={{
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "#f3e8ff",
          marginBottom: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          boxShadow: "0 10px 25px rgba(147, 51, 234, 0.2)",
          border: "4px solid #ffffff"
        }}>
          <Image 
            src="/public/landing_purple_coffee_1782016754930.png" 
            alt="The Purple Cup Cafe" 
            width={200} 
            height={200} 
            style={{ objectFit: "cover", width: "100%", height: "100%" }} 
          />
        </div>
        
        <h1 style={{
          fontSize: "28px",
          fontWeight: "800",
          color: "#7e22ce",
          margin: "0 0 12px 0",
          letterSpacing: "-0.5px"
        }}>
          The Purple Cup
        </h1>
        <p style={{
          fontSize: "15px",
          color: "#6b7280",
          margin: "0 0 32px 0",
          lineHeight: "1.5"
        }}>
          Welcome to {floorName}, Table {tableNumber}. 
          <br/>Browse our menu and place your order directly.
        </p>

        <button
          onClick={() => setStarted(true)}
          style={{
            background: "linear-gradient(135deg, #9333ea, #7e22ce)",
            color: "#ffffff",
            border: "none",
            borderRadius: "999px",
            padding: "16px 36px",
            fontSize: "16px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: "0 8px 20px rgba(147, 51, 234, 0.3)",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            width: "100%"
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Order Here <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
