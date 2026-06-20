import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pg",
    "pg-native",
    "ioredis",
    "@prisma/adapter-pg",
    "@prisma/client",
    "prisma",
    "bcryptjs",
    "jose",
    "nodemailer",
    "resend",
  ],

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
