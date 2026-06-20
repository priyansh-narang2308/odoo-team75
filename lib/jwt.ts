import { SignJWT, jwtVerify } from "jose";

const CUSTOMER_JWT_SECRET = new TextEncoder().encode(
  process.env.CUSTOMER_JWT_SECRET || "fallback-secret-change-in-production"
);

export interface CustomerJWTPayload {
  customerId: string;
  tableId: string;
  name: string;
  email: string;
}

// Sign a new customer session JWT
export async function signCustomerToken(
  payload: CustomerJWTPayload
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(CUSTOMER_JWT_SECRET);
}

// Verify and decode a customer session JWT
export async function verifyCustomerToken(
  token: string
): Promise<CustomerJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, CUSTOMER_JWT_SECRET);
    return payload as unknown as CustomerJWTPayload;
  } catch {
    return null;
  }
}
