import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/shared/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "The Purple Cup Café",
    template: "%s | The Purple Cup Café",
  },
  icons: {
    icon: "/fav.png",
  },
  description:
    "Modern Point-of-Sale system for The Purple Cup Café - order tracking, kitchen display, and real-time management.",
  keywords: ["cafe", "pos", "point of sale", "restaurant", "ordering"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${caveat.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SessionProvider>
            {children}
            <Toaster position="top-center" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
