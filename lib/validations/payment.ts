import { z } from "zod";

export const processPaymentSchema = z.object({
  methodId: z.string().min(1, "Payment method required"),
  amount: z.number().positive("Amount must be positive"),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
  // For cash: amount tendered by customer
  amountTendered: z.number().positive().optional(),
});

export const openSessionSchema = z.object({
  openingAmount: z
    .number()
    .min(0, "Opening amount must be 0 or more")
    .default(0),
});

export const closeSessionSchema = z.object({
  closingAmount: z.number().min(0, "Closing amount must be 0 or more"),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type OpenSessionInput = z.infer<typeof openSessionSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
