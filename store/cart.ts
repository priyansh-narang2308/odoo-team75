import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppliedPromotion {
  id: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmount: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
  taxRate: number;
}

interface CartState {
  items: CartItem[];
  tableId: string | null;
  orderId: string | null; // Set after order is created
  customerId: string | null;
  customerName: string | null;
  appliedPromotion: AppliedPromotion | null;

  // Actions
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  setTableId: (tableId: string | null) => void;
  setOrderId: (orderId: string | null) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  setAppliedPromotion: (promotion: AppliedPromotion | null) => void;

  // Computed
  totalItems: () => number;
  subtotal: () => number;
  taxTotal: () => number;
  discountTotal: () => number;
  grandTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      orderId: null,
      customerId: null,
      customerName: null,
      appliedPromotion: null,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: 1 }],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
        }));
      },

      updateNotes: (productId, notes) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, notes } : i,
          ),
        }));
      },

      clearCart: () => {
        set({
          items: [],
          orderId: null,
          customerId: null,
          customerName: null,
          appliedPromotion: null,
        });
      },

      setTableId: (tableId) => set({ tableId }),
      setOrderId: (orderId) => set({ orderId }),
      setCustomer: (id, name) => set({ customerId: id, customerName: name }),
      setAppliedPromotion: (promotion) => set({ appliedPromotion: promotion }),

      totalItems: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      subtotal: () => {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },

      taxTotal: () => {
        return get().items.reduce(
          (sum, i) => sum + i.price * i.quantity * (i.taxRate / 100),
          0,
        );
      },

      discountTotal: () => {
        const promo = get().appliedPromotion;
        return promo ? promo.discountAmount : 0;
      },

      grandTotal: () => {
        const state = get();
        const total =
          state.subtotal() + state.taxTotal() - state.discountTotal();
        return Math.max(0, total); // Ensure it doesn't go below 0
      },
    }),
    {
      name: "cafepos-cart",
      partialize: (state) => ({
        items: state.items,
        tableId: state.tableId,
        orderId: state.orderId,
        customerId: state.customerId,
        customerName: state.customerName,
      }),
    },
  ),
);
