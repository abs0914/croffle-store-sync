
import { Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import StoresPage from "@/pages/Stores";
import StoreForm from "@/pages/Stores/StoreForm";
import StoreQR from "@/pages/Stores/StoreQR";
import StoreSettings from "@/pages/Stores/StoreSettings";

export function AdminStoreRoutes() {
  return (
    <>
      {/* Admin Store Management Routes */}
      <Route path="/admin/stores/list" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <StoresPage />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/stores/new" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <StoreForm />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/stores/edit/:id" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <StoreForm />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/stores/:id/qr" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <StoreQR />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/stores/:id/settings" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <StoreSettings />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
    </>
  );
}
