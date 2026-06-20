import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  taxRate: z.number().min(0).max(100).default(0),
  unitOfMeasure: z.enum(["PIECE", "KG", "LITRE"]).default("PIECE"),
  isAvailable: z.boolean().default(true),
  showInKds: z.boolean().default(true),
  categoryId: z.string().min(1, "Category required"),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name required"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  sortOrder: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
