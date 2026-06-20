import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";
import { getCustomerSession } from "@/lib/customer-auth";

export default async function HomePage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  // If accessed via port 3001, redirect to customer interface
  if (host.includes(":3001")) {
    const customerSession = await getCustomerSession();
    if (customerSession) {
      redirect("/customer/menu");
    } else {
      redirect("/customer/login");
    }
  }

  // Otherwise route staff to the correct dashboard (port 3000)
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "KITCHEN") {
    redirect("/kds");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/pos");
}
