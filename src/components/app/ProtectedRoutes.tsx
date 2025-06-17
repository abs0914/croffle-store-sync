
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Products from "@/pages/Products";
import Orders from "@/pages/Orders";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import UsersPage from "@/pages/Settings/Users/UsersPage";
import CashiersPage from "@/pages/Settings/Cashiers/CashiersPage";
import ManagersPage from "@/pages/Settings/Managers/ManagersPage";
import { ThermalPrinterPage } from "@/pages/Settings/ThermalPrinter";
import StoresPage from "@/pages/Stores";
import StoreForm from "@/pages/Stores/StoreForm";
import StoreQR from "@/pages/Stores/StoreQR";
import StoreSettings from "@/pages/Stores/StoreSettings";
import InventoryPage from "@/pages/Inventory";
import ProductForm from "@/pages/Inventory/ProductForm";
import Categories from "@/pages/Inventory/Categories";
import InventoryStock from "@/pages/Inventory/InventoryStock";
import InventoryManagement from "@/pages/Inventory/InventoryManagement";
import Ingredients from "@/pages/Inventory/Ingredients";
import InventoryHistory from "@/pages/Inventory/InventoryHistory";
import BulkUpload from "@/pages/BulkUpload";
import CommissaryInventory from "@/pages/CommissaryInventory";
import InventoryConversion from "@/pages/InventoryConversion";
import OrderManagement from "@/pages/OrderManagement";
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

      <Route path="/products" element={
        <ProtectedRoute>
          <MainLayout>
            <Products />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/products/new" element={
        <ProtectedRoute>
          <MainLayout>
            <ProductForm />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/products/edit/:id" element={
        <ProtectedRoute>
          <MainLayout>
            <ProductForm />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/orders" element={
        <ProtectedRoute>
          <MainLayout>
            <Orders />
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

      <Route path="/settings/users" element={
        <ProtectedRoute>
          <MainLayout>
            <UsersPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings/cashiers" element={
        <ProtectedRoute>
          <MainLayout>
            <CashiersPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings/managers" element={
        <ProtectedRoute>
          <MainLayout>
            <ManagersPage />
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

      <Route path="/stores" element={
        <ProtectedRoute>
          <MainLayout>
            <StoresPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/stores/new" element={
        <ProtectedRoute>
          <MainLayout>
            <StoreForm />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/stores/edit/:id" element={
        <ProtectedRoute>
          <MainLayout>
            <StoreForm />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/stores/:id/qr" element={
        <ProtectedRoute>
          <MainLayout>
            <StoreQR />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/stores/:id/settings" element={
        <ProtectedRoute>
          <MainLayout>
            <StoreSettings />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/inventory" element={
        <ProtectedRoute>
          <MainLayout>
            <InventoryPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/inventory/categories" element={
        <ProtectedRoute>
          <MainLayout>
            <Categories />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/inventory/stock" element={
        <ProtectedRoute>
          <MainLayout>
            <InventoryStock />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/inventory/management" element={
        <ProtectedRoute>
          <MainLayout>
            <InventoryManagement />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/inventory/ingredients" element={
        <ProtectedRoute>
          <MainLayout>
            <Ingredients />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/inventory/history" element={
        <ProtectedRoute>
          <MainLayout>
            <InventoryHistory />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/bulk-upload" element={
        <ProtectedRoute>
          <MainLayout>
            <BulkUpload />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/commissary-inventory" element={
        <ProtectedRoute>
          <MainLayout>
            <CommissaryInventory />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/inventory-conversion" element={
        <ProtectedRoute>
          <MainLayout>
            <InventoryConversion />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/order-management" element={
        <ProtectedRoute>
          <MainLayout>
            <OrderManagement />
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
    </>
  );
}
