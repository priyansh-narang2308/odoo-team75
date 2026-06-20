// =============================================
// CafePOS — Shared Type Exports
// =============================================

// Re-export Prisma types for convenience
export type {
  User,
  Customer,
  Floor,
  Table,
  Category,
  Product,
  Session,
  PaymentMethod,
  Promotion,
  Order,
  OrderItem,
  Payment,
  AuditLog,
  Notification,
} from "@prisma/client";

export type {
  Role,
  OrderStatus,
  OrderSource,
  KdsStatus,
  PaymentType,
  DiscountType,
} from "@prisma/client";

// ---- API Response wrappers ----
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---- Extended types with relations ----
export interface OrderWithRelations {
  id: string;
  orderNumber: number;
  status: import("@prisma/client").OrderStatus;
  source: import("@prisma/client").OrderSource;
  customerNote: string | null;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  createdAt: Date;
  updatedAt: Date;
  table: { id: string; tableNumber: string; floor: { name: string } } | null;
  customer: { id: string; name: string; email: string } | null;
  user: { id: string; name: string } | null;
  items: OrderItemWithProduct[];
  payments: PaymentWithMethod[];
}

export interface OrderItemWithProduct {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
  kdsStatus: import("@prisma/client").KdsStatus;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    showInKds: boolean;
    category: { name: string; color: string };
  };
}

export interface PaymentWithMethod {
  id: string;
  amount: number;
  transactionRef: string | null;
  notes: string | null;
  method: {
    id: string;
    name: string;
    type: import("@prisma/client").PaymentType;
  };
  createdAt: Date;
}

export interface ProductWithCategory {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  taxRate: number;
  isAvailable: boolean;
  showInKds: boolean;
  category: { id: string; name: string; color: string };
}

export interface TableWithFloor {
  id: string;
  tableNumber: string;
  seats: number;
  isActive: boolean;
  qrToken: string | null;
  qrGeneratedAt: Date | null;
  floor: { id: string; name: string };
  orders: { id: string; status: import("@prisma/client").OrderStatus }[];
}
