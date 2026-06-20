import type { Metadata } from "next";
import { KDSBoard } from "@/components/kds/kds-board";

export const metadata: Metadata = { title: "Kitchen Display" };

export default function KDSPage() {
  return <KDSBoard />;
}