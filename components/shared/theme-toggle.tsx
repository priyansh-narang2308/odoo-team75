"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ sidebar = false }: { sidebar?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button 
        style={{ 
          background: "transparent", 
          border: "none", 
          padding: sidebar ? "12px 0" : "8px", 
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: sidebar ? "center" : "flex-start",
          width: "100%",
          opacity: 0
        }}
      >
        <div style={{ width: 24, height: 24 }} />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        background: "transparent",
        border: "none",
        padding: sidebar ? "12px 0" : "8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: sidebar ? "center" : "flex-start",
        width: sidebar ? "100%" : "auto",
        color: "var(--color-text-muted)",
        transition: "color var(--transition-fast)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--color-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--color-text-muted)";
      }}
    >
      {theme === "dark" ? <Sun size={sidebar ? 24 : 20} /> : <Moon size={sidebar ? 24 : 20} />}
    </button>
  );
}




