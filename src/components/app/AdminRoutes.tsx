
import { Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import AdminStores from "@/pages/Admin/AdminStores";
import AdminRecipes from "@/pages/Admin/AdminRecipes";
import AdminCustomers from "@/pages/Admin/AdminCustomers";
import AdminReports from "@/pages/Admin/AdminReports";
import AdminExpenses from "@/pages/Admin/AdminExpenses";
import AdminOrders from "@/pages/Admin/AdminOrders";
import CommissaryManagement from "@/pages/Commissary/CommissaryManagement";
import { AddOnsPage } from "@/pages/Admin/AddOnsPage";

// Import modular route components
import { AdminInventoryRoutes } from "./routes/AdminInventoryRoutes";
import { AdminUserRoutes } from "./routes/AdminUserRoutes";
import { AdminStoreRoutes } from "./routes/AdminStoreRoutes";

export function AdminRoutes() {
  console.log('🔵 AdminRoutes component loading...');
  
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

      {/* Expense Management Route */}
      <Route path="/admin/expenses" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminExpenses />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      
      {/* Admin Order Management - Ensure this uses AdminOrders */}
      <Route path="/admin/order-management" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminOrders />
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

      <Route path="/admin/add-ons" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AddOnsPage />
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
