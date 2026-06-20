import type { Metadata } from "next";
import { StaffManager } from "@/components/admin/staff-manager";

export const metadata: Metadata = { title: "Staff Management" };

export default function AdminStaffPage() {
  return <StaffManager />;
}
