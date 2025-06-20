
import { Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import AdminStores from "@/pages/Admin/AdminStores";
import AdminRecipes from "@/pages/Admin/AdminRecipes";
import AdminCustomers from "@/pages/Admin/AdminCustomers";
import AdminReports from "@/pages/Admin/AdminReports";
import OrderManagement from "@/pages/OrderManagement";
import CommissaryManagement from "@/pages/Commissary/CommissaryManagement";

// Import modular route components
import { AdminInventoryRoutes } from "./routes/AdminInventoryRoutes";
import { AdminUserRoutes } from "./routes/AdminUserRoutes";
import { AdminStoreRoutes } from "./routes/AdminStoreRoutes";

export function AdminRoutes() {
  return (
    <>
      {/* Core Admin Routes */}
      <Route path="/admin" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      
      <Route path="/admin/stores" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminStores />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      
      <Route path="/admin/recipes" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminRecipes />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      
      <Route path="/admin/customers" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminCustomers />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      
      <Route path="/admin/reports" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminReports />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      
      {/* Consolidated Order Management - replaces both /admin/orders and /admin/order-management */}
      <Route path="/admin/order-management" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <OrderManagement />
          </AdminLayout>
        </AdminProtectedRoute>
      } />

      <Route path="/admin/commissary" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <CommissaryManagement />
          </AdminLayout>
        </AdminProtectedRoute>
      } />

      {/* Modular Route Groups */}
      <AdminInventoryRoutes />
      <AdminUserRoutes />
      <AdminStoreRoutes />
    </>
  );
}
