
import { Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import Products from "@/pages/Products";
import ProductForm from "@/pages/Inventory/ProductForm";
import CommissaryManagement from "@/pages/Commissary/CommissaryManagement";
import SystemHealthMonitoring from "@/pages/Admin/SystemHealthMonitoring";
// InventoryConversion removed in favor of direct recipe management

export function AdminInventoryRoutes() {
  return (
    <>
      {/* Admin Product Management Routes */}
      <Route path="/admin/products" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Products />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/products/new" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <ProductForm />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/products/edit/:id" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <ProductForm />
          </AdminLayout>
        </AdminProtectedRoute>
      } />

      {/* Admin System Management Routes */}
      <Route path="/admin/commissary-inventory" element={
        <AdminProtectedRoute section="commissary-inventory">
          <AdminLayout>
            <CommissaryManagement />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      {/* Admin conversion routes removed in favor of direct recipe management */}
    </>
  );
}
