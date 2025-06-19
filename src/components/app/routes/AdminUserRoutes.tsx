
import { Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import UsersPage from "@/pages/Settings/Users/UsersPage";

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
    </>
  );
}
