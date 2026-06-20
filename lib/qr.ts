import { SignJWT, jwtVerify } from "jose";

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
