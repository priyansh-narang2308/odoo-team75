import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";
import { getCustomerSession } from "@/lib/customer-auth";

export default async function HomePage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  if (host.includes(":3001")) {
    const customerSession = await getCustomerSession();
    if (customerSession) {
      redirect("/customer/menu");
    } else {
      redirect("/customer/login");
    }
  }

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
