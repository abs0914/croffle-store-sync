
import React from 'react';
import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import AdminStores from '@/pages/Admin/AdminStores';
import AdminCustomers from '@/pages/Admin/AdminCustomers';
import AdminOrders from '@/pages/Admin/AdminOrders';
import AdminRecipes from '@/pages/Admin/AdminRecipes';
import AdminReports from '@/pages/Admin/AdminReports';
import AdminExpenses from '@/pages/Admin/AdminExpenses';
import InventoryConversion from '@/pages/InventoryConversion';
import ProductionManagement from '@/pages/ProductionManagement';
import { AdminInventoryRoutes } from './routes/AdminInventoryRoutes';
import { AdminStoreRoutes } from './routes/AdminStoreRoutes';
import { AdminUserRoutes } from './routes/AdminUserRoutes';

export const AdminAppRoutes = () => {
  return (
    <>
      {/* Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Inventory Conversion */}
      <Route
        path="/admin/inventory-conversion"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <InventoryConversion />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Production Management */}
      <Route
        path="/admin/production-management"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <ProductionManagement />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Stores */}
      <Route
        path="/admin/stores"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminStores />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Customers */}
      <Route
        path="/admin/customers"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminCustomers />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Orders */}
      <Route
        path="/admin/orders"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminOrders />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Recipes */}
      <Route
        path="/admin/recipes"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminRecipes />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Reports */}
      <Route
        path="/admin/reports"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminReports />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Expenses */}
      <Route
        path="/admin/expenses"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminExpenses />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Other Admin Routes */}
      {AdminInventoryRoutes()}
      {AdminStoreRoutes()}
      {AdminUserRoutes()}
    </>
  );
};
