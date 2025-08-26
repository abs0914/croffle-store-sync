
import { Route } from "react-router-dom";
import { RoleBasedRouteGuard } from "@/components/auth/RoleBasedRouteGuard";
import { AdminLayout } from "@/components/layout/AdminLayout";
import UsersPage from "@/pages/Settings/Users/UsersPage";

export function AdminUserRoutes() {
  return (
    <>
      {/* Admin User Management Routes */}
      <Route path="/admin/users" element={
        <RoleBasedRouteGuard requiredPermission="user_management">
          <AdminLayout>
            <UsersPage />
          </AdminLayout>
        </RoleBasedRouteGuard>
      } />
    </>
  );
}
