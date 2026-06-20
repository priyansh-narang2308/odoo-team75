import { z } from "zod";

export const createOrderSchema = z.object({
  tableId: z.string().optional(),
  source: z.enum(["CASHIER", "CUSTOMER"]).default("CASHIER"),
  customerNote: z.string().optional(),
  sessionId: z.string().optional(),
  customerId: z.string().optional(),
  promotionId: z.string().optional(),
  discountTotal: z.number().min(0).optional(),
});

export const addOrderItemSchema = z.object({
  productId: z.string().min(1, "Product ID required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

export const updateOrderItemSchema = z.object({
  quantity: z.number().int().min(0),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "CANCELLED"]),
});

export const applyPromotionSchema = z.object({
  code: z.string().min(1, "Promo code required"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
