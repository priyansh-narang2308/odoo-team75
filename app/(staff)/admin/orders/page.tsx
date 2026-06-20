import type { Metadata } from "next";
import { OrdersManager } from "@/components/admin/orders-manager";

export const metadata: Metadata = { title: "Order History" };

export default function AdminOrdersPage() {
  return <OrdersManager />;
}
