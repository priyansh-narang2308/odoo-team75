import type { Metadata } from "next";
import { TablesManager } from "@/components/admin/tables-manager";

export const metadata: Metadata = { title: "Tables & Floors" };

export default function AdminTablesPage() {
  return <TablesManager />;
}
