
import { Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminProductCatalogManagement from "@/pages/Admin/AdminProductCatalogManagement";

export function AdminProductRoutes() {
  return (
    <Route path="/admin/product-catalog" element={
      <AdminProtectedRoute>
        <AdminLayout>
          <AdminProductCatalogManagement />
        </AdminLayout>
      </AdminProtectedRoute>
    } />
  );
}
