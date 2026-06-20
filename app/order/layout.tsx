import { SocketProvider } from "@/components/providers/socket-provider";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}
