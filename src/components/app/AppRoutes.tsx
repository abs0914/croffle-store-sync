
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import CustomerForm from "@/pages/Stores/CustomerForm";
import CustomerFormPreview from "@/pages/Stores/CustomerFormPreview";

// Import all the route components we need
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";

// Admin pages
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import AdminStores from "@/pages/Admin/AdminStores";
import AdminRecipes from "@/pages/Admin/AdminRecipes";
import AdminCustomers from "@/pages/Admin/AdminCustomers";
import AdminOrders from "@/pages/Admin/AdminOrders";
import AdminReports from "@/pages/Admin/AdminReports";
import BulkUpload from "@/pages/BulkUpload";
import OrderManagement from "@/pages/OrderManagement";

// Admin User Management
import UsersPage from "@/pages/Settings/Users/UsersPage";
import CashiersPage from "@/pages/Settings/Cashiers/CashiersPage";
import ManagersPage from "@/pages/Settings/Managers/ManagersPage";

// Admin Store Management
import StoresPage from "@/pages/Stores";
import StoreForm from "@/pages/Stores/StoreForm";
import StoreQR from "@/pages/Stores/StoreQR";
import StoreSettings from "@/pages/Stores/StoreSettings";

// Admin Inventory Management
import Products from "@/pages/Products";
import ProductForm from "@/pages/Inventory/ProductForm";
import InventoryPage from "@/pages/Inventory";
import Categories from "@/pages/Inventory/Categories";
import InventoryStock from "@/pages/Inventory/InventoryStock";
import InventoryManagement from "@/pages/Inventory/InventoryManagement";
import Ingredients from "@/pages/Inventory/Ingredients";
import InventoryHistory from "@/pages/Inventory/InventoryHistory";
import CommissaryInventory from "@/pages/CommissaryInventory";
import InventoryConversion from "@/pages/InventoryConversion";

// Protected app pages
import Dashboard from "@/pages/Dashboard";
import OwnerDashboard from "@/pages/OwnerDashboard";
import POS from "@/pages/POS";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import { ThermalPrinterPage } from "@/pages/Settings/ThermalPrinter";
import CustomerManagement from "@/pages/Customers/CustomerManagement";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/customer-form/:storeId" element={<CustomerForm />} />
      <Route path="/customer-form-preview/:storeId" element={<CustomerFormPreview />} />

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
      
      <Route path="/admin/orders" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <AdminOrders />
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

      <Route path="/admin/bulk-upload" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <BulkUpload />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      
      <Route path="/admin/order-management" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <OrderManagement />
          </AdminLayout>
        </AdminProtectedRoute>
      } />

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

      {/* Admin Product Management Routes */}
      <Route path="/admin/products" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Products />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/products/new" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <ProductForm />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/products/edit/:id" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <ProductForm />
          </AdminLayout>
        </AdminProtectedRoute>
      } />

      {/* Admin Inventory Management Routes */}
      <Route path="/admin/inventory" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <InventoryPage />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/categories" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Categories />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/stock" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <InventoryStock />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/management" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <InventoryManagement />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/ingredients" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Ingredients />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory/history" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <InventoryHistory />
          </AdminLayout>
        </AdminProtectedRoute>
      } />

      {/* Admin System Management Routes */}
      <Route path="/admin/commissary-inventory" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <CommissaryInventory />
          </AdminLayout>
        </AdminProtectedRoute>
      } />
      <Route path="/admin/inventory-conversion" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <InventoryConversion />
          </AdminLayout>
        </AdminProtectedRoute>
      } />

      {/* Protected app routes - NO RECIPE MANAGEMENT ROUTES */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* Owner Dashboard Route */}
      <Route path="/owner-dashboard" element={
        <ProtectedRoute>
          <MainLayout>
            <OwnerDashboard />
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

      {/* Store-level Inventory Routes */}
      <Route path="/inventory" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
          <MainLayout>
            <InventoryPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/inventory/product/new" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
          <MainLayout>
            <ProductForm />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/inventory/product/:id" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
          <MainLayout>
            <ProductForm />
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
    </Routes>
  );
}
