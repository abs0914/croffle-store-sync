
import React from 'react';
import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import AdminStores from '@/pages/Admin/AdminStores';
import AdminCustomers from '@/pages/Admin/AdminCustomers';
import AdminOrders from '@/pages/Admin/AdminOrders';

import AdminReports from '@/pages/Admin/AdminReports';
import AdminExpenses from '@/pages/Admin/AdminExpenses';
import CommissaryManagement from '@/pages/Commissary/CommissaryManagement';
import ProductionManagement from '@/pages/ProductionManagement';
import { RecipeManagement } from '@/pages/Admin/RecipeManagement';
import { DeploymentVerification } from '@/pages/Admin/DeploymentVerification';
import { AdminAccounting } from '@/pages/Admin/Accounting/AdminAccounting';
import { ChartOfAccounts } from '@/pages/Admin/Accounting/ChartOfAccounts';
import { GeneralLedger } from '@/pages/Admin/Accounting/GeneralLedger';
import { FinancialStatements } from '@/pages/Admin/Accounting/FinancialStatements';
import { PeriodClosing } from '@/pages/Admin/Accounting/PeriodClosing';
import { FinancialAnalytics } from '@/pages/Admin/Accounting/FinancialAnalytics';
import { ManualAdjustments } from '@/pages/Admin/Accounting/ManualAdjustments';
import { BankReconciliation } from '@/pages/Admin/Accounting/BankReconciliation';
import { AdminInventoryRoutes } from './routes/AdminInventoryRoutes';
import { AdminUserRoutes } from './routes/AdminUserRoutes';
import { AdminStoreRoutes } from './routes/AdminStoreRoutes';
import { AdminPage } from '@/pages/Admin/AdminPage';
import PriceUpdateRunner from '@/pages/Admin/PriceUpdateRunner';

export const AdminAppRoutes = () => {
  console.log('🔵 AdminAppRoutes component loading...');
  
  return (
    <>
      {/* Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Legacy Admin Dashboard */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Deployment Verification */}
      <Route
        path="/admin/deployment-verification"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <DeploymentVerification />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Commissary Inventory - Admin Only */}
      <Route
        path="/admin/commissary-inventory"
        element={
          <AdminProtectedRoute section="commissary-inventory">
            <AdminLayout>
              <CommissaryManagement />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Recipe Management - Unified Route */}
      <Route
        path="/admin/recipe-management"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <RecipeManagement />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Redirect old recipes route to new unified recipe management */}
      <Route
        path="/admin/recipes"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <RecipeManagement />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Admin Production Management - Admin Only */}
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

      {/* Admin Order Management */}
      <Route
        path="/admin/order-management"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminOrders />
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

      {/* Admin Accounting */}
      <Route
        path="/admin/accounting"
        element={
          <AdminProtectedRoute section="accounting">
            <AdminLayout>
              <AdminAccounting />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Chart of Accounts */}
      <Route
        path="/admin/accounting/chart-of-accounts"
        element={
          <AdminProtectedRoute section="accounting">
            <AdminLayout>
              <ChartOfAccounts />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Financial Statements */}
      <Route
        path="/admin/accounting/financial-statements"
        element={
          <AdminProtectedRoute section="accounting">
            <AdminLayout>
              <FinancialStatements />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* General Ledger */}
      <Route
        path="/admin/accounting/general-ledger"
        element={
          <AdminProtectedRoute section="accounting">
            <AdminLayout>
              <GeneralLedger />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Period Closing */}
      <Route
        path="/admin/accounting/period-closing"
        element={
          <AdminProtectedRoute section="accounting">
            <AdminLayout>
              <PeriodClosing />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Financial Analytics */}
      <Route
        path="/admin/accounting/analytics"
        element={
          <AdminProtectedRoute section="accounting">
            <AdminLayout>
              <FinancialAnalytics />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Manual Adjustments */}
      <Route
        path="/admin/accounting/adjustments"
        element={
          <AdminProtectedRoute section="accounting">
            <AdminLayout>
              <ManualAdjustments />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Bank Reconciliation */}
      <Route
        path="/admin/accounting/reconciliation"
        element={
          <AdminProtectedRoute section="accounting">
            <AdminLayout>
              <BankReconciliation />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Journal Entry (redirect to General Ledger) */}
      <Route
        path="/admin/accounting/journal-entry"
        element={
          <AdminProtectedRoute section="accounting">
            <AdminLayout>
              <GeneralLedger />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Price Update Runner - Utility Tool */}
      <Route
        path="/admin/price-update"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <PriceUpdateRunner />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      {/* Modular Admin Routes */}
      {AdminInventoryRoutes()}
      {AdminUserRoutes()}
      {AdminStoreRoutes()}
    </>
  );
};
