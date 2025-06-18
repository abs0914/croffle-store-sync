
import React from 'react';
import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import AdminStores from '@/pages/Admin/AdminStores';
import AdminRecipes from '@/pages/Admin/AdminRecipes';
import AdminCustomers from '@/pages/Admin/AdminCustomers';
import AdminOrders from '@/pages/Admin/AdminOrders';
import AdminReports from '@/pages/Admin/AdminReports';
import OrderManagement from '@/pages/OrderManagement';
import CommissaryInventory from '@/pages/CommissaryInventory';
import ProductionManagement from '@/pages/ProductionManagement';
import UsersPage from '@/pages/Settings/Users/UsersPage';
import CashiersPage from '@/pages/Settings/Cashiers/CashiersPage';
import ManagersPage from '@/pages/Settings/Managers/ManagersPage';
import StoresPage from '@/pages/Stores';
import StoreForm from '@/pages/Stores/StoreForm';
import StoreQR from '@/pages/Stores/StoreQR';
import StoreSettings from '@/pages/Stores/StoreSettings';

export const AdminAppRoutes = () => [
  // Core Admin Routes
  <Route key="admin" path="/admin" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  
  <Route key="admin-stores" path="/admin/stores" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminStores />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  
  <Route key="admin-recipes" path="/admin/recipes" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminRecipes />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  
  <Route key="admin-commissary-inventory" path="/admin/commissary-inventory" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <CommissaryInventory />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  
  <Route key="admin-production-management" path="/admin/production-management" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <ProductionManagement />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  
  <Route key="admin-customers" path="/admin/customers" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminCustomers />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  
  <Route key="admin-orders" path="/admin/orders" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminOrders />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  
  <Route key="admin-order-management" path="/admin/order-management" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <OrderManagement />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  
  <Route key="admin-reports" path="/admin/reports" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminReports />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,

  // Admin User Management Routes
  <Route key="admin-users" path="/admin/users" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <UsersPage />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  <Route key="admin-cashiers" path="/admin/cashiers" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <CashiersPage />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  <Route key="admin-managers" path="/admin/managers" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <ManagersPage />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,

  // Admin Store Management Routes
  <Route key="admin-stores-list" path="/admin/stores/list" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <StoresPage />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  <Route key="admin-stores-new" path="/admin/stores/new" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <StoreForm />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  <Route key="admin-stores-edit" path="/admin/stores/edit/:id" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <StoreForm />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  <Route key="admin-stores-qr" path="/admin/stores/:id/qr" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <StoreQR />
      </AdminLayout>
    </AdminProtectedRoute>
  } />,
  <Route key="admin-stores-settings" path="/admin/stores/:id/settings" element={
    <AdminProtectedRoute>
      <AdminLayout>
        <StoreSettings />
      </AdminLayout>
    </AdminProtectedRoute>
  } />
];
