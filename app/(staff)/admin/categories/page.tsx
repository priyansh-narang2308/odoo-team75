import { CategoryManager } from "@/components/admin/category-manager";

export const metadata = {
  title: "Categories Management - CafePOS",
};

export default function CategoriesPage() {
  return (
    <div style={{ flex: 1, padding: "20px" }}>
      <CategoryManager />
    </div>
  );
}
