
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import { ThermalPrinterPage } from "@/pages/Settings/ThermalPrinter";
import CustomerManagement from "@/pages/Customers/CustomerManagement";

export function ProtectedRoutes() {
  return (
    <>
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/pos" element={
        <ProtectedRoute>
          <MainLayout>
            <POS />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/customers" element={
        <ProtectedRoute>
          <MainLayout>
            <CustomerManagement />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute>
          <MainLayout>
            <Reports />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <MainLayout>
            <Settings />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings/thermal-printer" element={
        <ProtectedRoute>
          <MainLayout>
            <ThermalPrinterPage />
          </MainLayout>
        </ProtectedRoute>
      } />
    </>
  );
}
