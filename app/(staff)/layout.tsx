import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffSidebar } from "@/components/shared/staff-sidebar";
import { SocketProvider } from "@/components/providers/socket-provider";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <SocketProvider>
      <div
        className="staff-layout-wrapper"
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "var(--color-bg)",
        }}
      >
        <StaffSidebar
          userName={session.user.name}
          userRole={session.user.role}
          userEmail={session.user.email}
        />
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            overflow: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </SocketProvider>
  );
}
