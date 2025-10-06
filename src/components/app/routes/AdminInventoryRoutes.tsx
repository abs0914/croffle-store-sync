
import { Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import Products from "@/pages/Products";
import ProductForm from "@/pages/Inventory/ProductForm";
import InventoryPage from "@/pages/Inventory";
import Categories from "@/pages/Inventory/Categories";
import InventoryStock from "@/pages/Inventory/InventoryStock";
import InventoryManagement from "@/pages/Inventory/InventoryManagement";
import Ingredients from "@/pages/Inventory/Ingredients";
import InventoryHistory from "@/pages/Inventory/InventoryHistory";
import CommissaryManagement from "@/pages/Commissary/CommissaryManagement";
import { CrossStoreMappingFixer } from "@/components/inventory/CrossStoreMappingFixer";
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

      {/* Admin Inventory Management Routes */}
      <Route path="/admin/inventory" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <InventoryPage />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/categories" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Categories />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/stock" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <InventoryStock />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/management" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <InventoryManagement />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/ingredients" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Ingredients />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/history" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <InventoryHistory />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/cross-store-repair" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <CrossStoreMappingFixer />
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
