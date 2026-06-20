import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency as INR
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(num);
}

// Format date/time
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

// Calculate change for cash payment
export function calculateChange(
  grandTotal: number,
  receivedAmount: number,
): number {
  return Math.max(0, receivedAmount - grandTotal);
}

// Build UPI deep link
export function buildUPILink(
  upiId: string,
  amount: number,
  name: string = "Cafe Odoo",
): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount.toFixed(2),
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}

// Truncate string
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

// Generate a short reference ID
export function generateRef(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
