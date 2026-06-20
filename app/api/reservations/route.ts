import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createReservationSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().optional().nullable(),
  seats: z.number().int().min(1),
  date: z.string().min(1), // YYYY-MM-DD
  time: z.string().min(1), // HH:MM
  tableId: z.string().min(1),
});

// GET /api/reservations
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const check = searchParams.get("check") === "true";

  if (check) {
    const date = searchParams.get("date");
    const time = searchParams.get("time");
    const seats = searchParams.get("seats");

    if (!date || !time || !seats) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameters (date, time, seats)" },
        { status: 400 }
      );
    }

    try {
      // Parse date & time to Date object
      const reserveTime = new Date(`${date}T${time}:00`);
      if (isNaN(reserveTime.getTime())) {
        return NextResponse.json(
          { ok: false, error: "Invalid date or time format" },
          { status: 400 }
        );
      }

      // Validation: Date and time in past check
      const now = new Date();
      if (reserveTime < now) {
        return NextResponse.json(
          { ok: false, error: "Reservation date and time cannot be in the past" },
          { status: 400 }
        );
      }

      // Validation: Time check (10:00 AM to 11:59 PM)
      const [hours, minutes] = time.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;
      const minMinutes = 10 * 60; // 10:00 AM
      const maxMinutes = 23 * 60 + 59; // 11:59 PM (23:59)
      if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
        return NextResponse.json(
          { ok: false, error: "Booking time must be between 10:00 and 23:59" },
          { status: 400 }
        );
      }

      // Calculate search window: reserveTime - 2 hours to reserveTime + 2 hours
      const startWindow = new Date(reserveTime.getTime() - 2 * 60 * 60 * 1000);
      const endWindow = new Date(reserveTime.getTime() + 2 * 60 * 60 * 1000);

      // Find active tables with exactly the requested number of seats
      const matchingTables = await prisma.table.findMany({
        where: {
          isActive: true,
          seats: Number(seats),
        },
        include: {
          floor: {
            select: { id: true, name: true },
          },
          reservations: {
            where: {
              reserveTime: {
                gte: startWindow,
                lte: endWindow,
              },
            },
          },
        },
      });

      // Filter out tables that have any reservations in the overlap window
      const availableTables = matchingTables.filter(
        (table) => table.reservations.length === 0
      );

      // Sort tables alphanumerically by tableNumber
      availableTables.sort((a, b) =>
        a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: "base" })
      );

      return NextResponse.json({ ok: true, data: availableTables });
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: err.message || "Failed to check available tables" },
        { status: 500 }
      );
    }
  }

  // Otherwise, return all reservations
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        table: {
          include: {
            floor: { select: { name: true } },
          },
        },
      },
      orderBy: {
        reserveTime: "asc",
      },
    });

    return NextResponse.json({ ok: true, data: reservations });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

// POST /api/reservations
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { customerName, phone, seats, date, time, tableId } = parsed.data;
    const reserveTime = new Date(`${date}T${time}:00`);

    if (isNaN(reserveTime.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid date or time format" },
        { status: 400 }
      );
    }

    // Validation: Date and time in past check
    const now = new Date();
    if (reserveTime < now) {
      return NextResponse.json(
        { ok: false, error: "Reservation date and time cannot be in the past" },
        { status: 400 }
      );
    }

    // Validation: Time check (10:00 AM to 11:59 PM)
    const [hours, minutes] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    const minMinutes = 10 * 60; // 10:00 AM
    const maxMinutes = 23 * 60 + 59; // 11:59 PM (23:59)
    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      return NextResponse.json(
        { ok: false, error: "Booking time must be between 10:00 and 23:59" },
        { status: 400 }
      );
    }

    // Double check availability before booking
    const startWindow = new Date(reserveTime.getTime() - 2 * 60 * 60 * 1000);
    const endWindow = new Date(reserveTime.getTime() + 2 * 60 * 60 * 1000);

    const existingBooking = await prisma.reservation.findFirst({
      where: {
        tableId,
        reserveTime: {
          gte: startWindow,
          lte: endWindow,
        },
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { ok: false, error: "Table is already booked during this time slot." },
        { status: 409 }
      );
    }

    // Create the reservation
    const reservation = await prisma.reservation.create({
      data: {
        customerName,
        phone,
        seats,
        reserveTime,
        tableId,
      },
      include: {
        table: {
          include: { floor: true },
        },
      },
    });

    return NextResponse.json({ ok: true, data: reservation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create reservation" },
      { status: 500 }
    );
  }
}
