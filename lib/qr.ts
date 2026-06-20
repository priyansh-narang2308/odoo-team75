import { SignJWT, jwtVerify } from "jose";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const QR_SECRET = new TextEncoder().encode(
  process.env.QR_SECRET || "fallback-qr-secret-change-in-production",
);

export interface QRTokenPayload {
  tableId: string;
  floorId: string;
  tableNumber: string;
}

export async function signQRToken(payload: QRTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // QR tokens don't expire — admin can invalidate by regenerating
    .sign(QR_SECRET);
}

// Verify a QR token from the URL
export async function verifyQRToken(
  token: string,
): Promise<QRTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, QR_SECRET);
    return payload as unknown as QRTokenPayload;
  } catch {
    return null;
  }
}

// Generate QR code token and save image to disk
export async function generateAndSaveQR(table: { id: string; floorId: string; tableNumber: string }): Promise<string> {
  const token = await signQRToken({
    tableId: table.id,
    floorId: table.floorId,
    tableNumber: table.tableNumber,
  });

  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/order/${token}`;

  const qrDir = path.join(process.cwd(), "public", "qrcodes");
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  const qrFilename = `table-${table.tableNumber.replace(/\s+/g, "-")}-${table.id}.png`;
  const qrFilePath = path.join(qrDir, qrFilename);

  const pythonScript = path.join(process.cwd(), "lib", "generate_qr.py");
  const logoPath = path.join(process.cwd(), "public", "logo.png");

  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  try {
    execSync(`${pythonCmd} "${pythonScript}" "${qrUrl}" "${qrFilePath}" "${logoPath}"`);
  } catch (error: any) {
    console.error("Python QR generation failed, using standard fallback:", error.message || error);
    await QRCode.toFile(qrFilePath, qrUrl, {
      width: 512,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    });
  }

  return token;
}
