export const SOCKET_EVENTS = {
  JOIN_TABLE: "join:table",
  JOIN_KITCHEN: "join:kitchen",
  JOIN_CASHIER: "join:cashier",
  JOIN_ADMIN: "join:admin",

  // ---- Orders (Customer → Server → Kitchen + Cashier) ----
  ORDER_PLACED: "order:placed", // New order from QR
  ORDER_UPDATED: "order:updated", // Item added/removed
  ORDER_STATUS: "order:status", // DRAFT→SENT→PAID

  // ---- KDS (Kitchen → Server → Cashier + Customer) ----
  KDS_NEW_TICKET: "kds:new_ticket", // New order arrives in kitchen
  KDS_ITEM_UPDATED: "kds:item_updated", // PENDING/PREPARING/READY/DONE
  KDS_ORDER_COMPLETE: "kds:order_complete", // All items DONE

  // ---- Table (Server → Cashier) ----
  TABLE_STATUS: "table:status", // available/occupied/bill-pending
  TABLE_LOCK_ACQUIRED: "table:lock:acquired",
  TABLE_LOCK_RELEASED: "table:lock:released",

  // ---- Payments ----
  PAYMENT_RECEIVED: "payment:received", // Payment confirmed

  // ---- Customer Display ----
  CUSTOMER_DISPLAY_SYNC: "customer_display:sync", // Sync cart items to customer display
  CUSTOMER_DISPLAY_CHECKOUT: "customer_display:checkout", // Show UPI QR / payment screen
  CUSTOMER_DISPLAY_SUCCESS: "customer_display:success", // Show "Thank you" screen
  CUSTOMER_DISPLAY_IDLE: "customer_display:idle", // Reset to welcome screen

  // ---- Notifications ----
  NOTIFY_TOAST: "notify:toast", // Flash notification to specific room
  BILL_REQUESTED: "table:bill_request", // Customer taps "Request Bill"
} as const;

export type SocketEventKey = keyof typeof SOCKET_EVENTS;
export type SocketEventValue = (typeof SOCKET_EVENTS)[SocketEventKey];
