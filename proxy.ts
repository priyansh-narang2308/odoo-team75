import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyCustomerToken } from "@/lib/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/order/")) {
    // Extract table token from path
    const segments = pathname.split("/");
    // /order/[tableToken]/status or /order/[tableToken]/receipt
    // Allow the root /order/[tableToken] page even without session (shows auth gate)
    // Protect /status and /receipt pages
    if (segments.length >= 4 && ["status", "receipt"].includes(segments[3])) {
      const sessionCookie = request.cookies.get("customer_session")?.value;
      if (!sessionCookie) {
        const tableToken = segments[2];
        return NextResponse.redirect(
          new URL(`/order/${tableToken}`, request.url),
        );
      }

      const session = await verifyCustomerToken(sessionCookie);
      if (!session) {
        const tableToken = segments[2];
        return NextResponse.redirect(
          new URL(`/order/${tableToken}`, request.url),
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*", "/kds/:path*", "/admin/:path*", "/order/:path*"],
};
