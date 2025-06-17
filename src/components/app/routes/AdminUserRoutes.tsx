
import { Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import UsersPage from "@/pages/Settings/Users/UsersPage";
import CashiersPage from "@/pages/Settings/Cashiers/CashiersPage";
import ManagersPage from "@/pages/Settings/Managers/ManagersPage";

export function AdminUserRoutes() {
  return (
    <>
      {/* Admin User Management Routes */}
      <Route path="/admin/users" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <UsersPage />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/cashiers" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <CashiersPage />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/managers" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <ManagersPage />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
    </>
  );
}
