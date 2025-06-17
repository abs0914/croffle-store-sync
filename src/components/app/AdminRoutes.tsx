
import { Routes, Route } from "react-router-dom";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import AdminStores from "@/pages/Admin/AdminStores";
import AdminRecipes from "@/pages/Admin/AdminRecipes";
import AdminCustomers from "@/pages/Admin/AdminCustomers";
import AdminOrders from "@/pages/Admin/AdminOrders";
import AdminReports from "@/pages/Admin/AdminReports";

export function AdminRoutes() {
  return (
    <Route path="/admin/*" element={
      <AdminProtectedRoute>
        <AdminLayout>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="stores" element={<AdminStores />} />
            <Route path="recipes" element={<AdminRecipes />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="reports" element={<AdminReports />} />
          </Routes>
        </AdminLayout>
      </AdminProtectedRoute>
    } />
  );
}
