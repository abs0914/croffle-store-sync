
import { Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminStores from "@/pages/Admin/AdminStores";
import AdminStoreForm from "@/pages/Admin/components/AdminStoreForm";
import AdminStoreQR from "@/pages/Admin/components/AdminStoreQR";
import AdminStoreSettings from "@/pages/Admin/components/AdminStoreSettings";

export function AdminStoreRoutes() {
  return (
    <>
      {/* Admin Store Management Routes */}
      <Route path="/admin/stores/list" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminStores />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/stores/new" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminStoreForm />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/stores/edit/:id" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminStoreForm />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/stores/:id/qr" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminStoreQR />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/stores/:id/settings" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminStoreSettings />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
    </>
  );
}
