import type { Metadata } from "next";
import { POSTerminal } from "@/components/pos/pos-terminal";

export const metadata: Metadata = {
  title: "POS Terminal",
};

export default function POSPage() {
  return <POSTerminal />;
}
