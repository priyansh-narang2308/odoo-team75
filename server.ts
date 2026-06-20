// CafePOS — Custom Next.js + Socket.IO Server
// Run with:npx tsx server.ts

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { SOCKET_EVENTS } from "./lib/socket-events";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  const pubClient = new Redis(
    process.env.REDIS_URL || "redis://localhost:6379",
    {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
    },
  );
  const subClient = pubClient.duplicate();

  pubClient.on("error", () => {});

  subClient.on("error", () => {});

  Promise.all([pubClient.ping(), subClient.ping()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("[Socket.IO] Redis adapter connected");
    })
    .catch((err) => {
      console.warn(
        "[Socket.IO] Redis adapter failed, using in-memory:",
        err.message,
      );
    });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // ---- Room Joins ----cl
    socket.on(SOCKET_EVENTS.JOIN_TABLE, (tableId: string) => {
      socket.join(`table:${tableId}`);
      console.log(`[Socket.IO] ${socket.id} joined table:${tableId}`);
    });

    socket.on(SOCKET_EVENTS.JOIN_KITCHEN, () => {
      socket.join("kitchen");
      console.log(`[Socket.IO] ${socket.id} joined kitchen`);
    });

    socket.on(SOCKET_EVENTS.JOIN_CASHIER, () => {
      socket.join("cashier");
      console.log(`[Socket.IO] ${socket.id} joined cashier`);
    });

    socket.on(SOCKET_EVENTS.JOIN_ADMIN, () => {
      socket.join("admin");
      console.log(`[Socket.IO] ${socket.id} joined admin`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).io = io;

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
