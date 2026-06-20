// =============================================
// CafePOS — Socket.IO Event Payload Types
// =============================================

import type { KdsStatus, OrderStatus, OrderSource, Role } from "@prisma/client";

// ---- JOIN events ----
export interface JoinTablePayload {
  tableId: string;
}

// ---- ORDER events ----
export interface OrderPlacedPayload {
  orderId: string;
  orderNumber: number;
  tableId: string;
  tableNumber: string;
  source: OrderSource;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }[];
  grandTotal: number;
}

export interface OrderUpdatedPayload {
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
  grandTotal: number;
}

export interface OrderStatusPayload {
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
  tableId?: string;
}

// ---- KDS events ----
export interface KDSTicketPayload {
  orderId: string;
  orderNumber: number;
  tableId?: string;
  tableNumber?: string;
  source: OrderSource;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    notes?: string;
    kdsStatus: KdsStatus;
  }[];
}

export interface KDSItemUpdatedPayload {
  orderId: string;
  itemId: string;
  productName: string;
  kdsStatus: KdsStatus;
}

export interface KDSOrderCompletePayload {
  orderId: string;
  orderNumber: number;
  tableId?: string;
}

// ---- TABLE events ----
export type TableOccupancyStatus = "available" | "occupied" | "bill-pending";

export interface TableStatusPayload {
  tableId: string;
  status: TableOccupancyStatus;
  orderCount?: number;
}

export interface TableLockPayload {
  tableId: string;
  userId: string;
  userName: string;
}

// ---- PAYMENT events ----
export interface PaymentReceivedPayload {
  orderId: string;
  orderNumber: number;
  tableId?: string;
  amount: number;
  method: string;
}

// ---- NOTIFICATION events ----
export interface NotifyToastPayload {
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export interface BillRequestedPayload {
  tableId: string;
  tableNumber: string;
  orderId: string;
  orderNumber: number;
  grandTotal: number;
}
