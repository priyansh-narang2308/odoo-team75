import { PaymentMethodManager } from "@/components/admin/payment-method-manager";

export const metadata = {
  title: "Payment Methods - CafePOS",
};

export default function PaymentMethodsPage() {
  return (
    <div style={{ flex: 1, padding: "20px" }}>
      <PaymentMethodManager />
    </div>
  );
}
