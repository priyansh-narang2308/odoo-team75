import { SocketProvider } from "@/components/providers/socket-provider";

export const metadata = {
  title: "Customer Display | The Purple Cup Cafe POS",
  description: "Customer-facing display showing live order details",
};

export default function CustomerDisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SocketProvider>{children}</SocketProvider>;
}
