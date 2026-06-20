import type { Metadata } from "next";
import { PromotionsManager } from "@/components/admin/promotions-manager";

export const metadata: Metadata = { title: "Promotions" };

export default function AdminPromotionsPage() {
  return <PromotionsManager />;
}
