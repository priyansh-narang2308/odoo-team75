import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    // Check DB
    await prisma.$queryRaw`SELECT 1`;
    const dbOk = true;

    // Check Redis
    const redisPong = await redis.ping();
    const redisOk = redisPong === "PONG";

    return NextResponse.json({
      ok: true,
      data: {
        status: "healthy",
        database: dbOk ? "connected" : "error",
        redis: redisOk ? "connected" : "error",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Health check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
