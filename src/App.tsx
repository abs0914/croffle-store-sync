
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Settings from '@/pages/Settings';
import UsersPage from '@/pages/Settings/Users/UsersPage';
import StoresPage from '@/pages/Stores';
import ProductsPage from '@/pages/Products';
import CustomersPage from '@/pages/Customers/CustomerManagement';
import ReportsPage from '@/pages/Reports';
import InventoryPage from '@/pages/Inventory';
import ProductionPage from '@/pages/ProductionManagement';
import CommissaryInventoryPage from '@/pages/CommissaryInventory';
import { StockOrdersManagement } from '@/pages/StockOrders/StockOrdersManagement';
import PosPage from '@/pages/POS';
import OrderManagementPage from '@/pages/OrderManagement/OrderManagementPage';
import ExpensesDashboard from '@/pages/Expenses/ExpensesDashboard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { StoreProvider } from '@/contexts/StoreContext';
import { SecurityAuditProvider } from '@/contexts/auth/SecurityAuditContext';
import { SimplifiedAuthProvider } from '@/contexts/auth/SimplifiedAuthProvider';
import { SecurityMonitoringDashboard } from './components/security/SecurityMonitoringDashboard';
import { LoadingFallback } from '@/components/ui/LoadingFallback';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthDebugPanel } from '@/components/debug/AuthDebugPanel';
import { PermissionAuditPanel } from '@/components/debug/PermissionAuditPanel';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SecurityAuditProvider>
          <SimplifiedAuthProvider>
            <StoreProvider>
              <div>
                <Toaster />
                <Routes>
                  {/* Root route using Index component for proper auth handling */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />

                  {/* MAIN DASHBOARD ROUTE */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Dashboard />
                      </MainLayout>
                    </ProtectedRoute>
                  } />

                  {/* POS and Store Operations */}
                  <Route path="/pos" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <PosPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/products" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <ProductsPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/customers" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <CustomersPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/reports" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <ReportsPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/orders" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <OrderManagementPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <ExpensesDashboard />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/inventory" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <InventoryPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/production" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <ProductionPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/stock-orders" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <StockOrdersManagement />
                      </MainLayout>
                    </ProtectedRoute>
                  } />

                  {/* Admin and Settings */}
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
                  <Route path="/settings/stores" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <StoresPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/commissary" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <CommissaryInventoryPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/security" element={
                    <ProtectedRoute requiredRole="admin">
                      <MainLayout>
                        <SecurityMonitoringDashboard />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch all - redirect to root for proper auth handling */}
                  <Route path="*" element={<Index />} />
                </Routes>

                {/* Debug panels for development */}
                <AuthDebugPanel />
                <PermissionAuditPanel />
              </div>
            </StoreProvider>
          </SimplifiedAuthProvider>
        </SecurityAuditProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
