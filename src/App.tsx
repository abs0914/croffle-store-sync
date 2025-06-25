
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

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
import OrderManagementPage from '@/pages/OrderManagement';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StoreProvider } from '@/contexts/StoreContext';
import { SecurityAuditProvider } from '@/contexts/auth/SecurityAuditContext';
import { SimplifiedAuthProvider } from '@/contexts/auth/SimplifiedAuthProvider';
import { SecurityMonitoringDashboard } from './components/security/SecurityMonitoringDashboard';
import { LoadingFallback } from '@/components/ui/LoadingFallback';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SecurityAuditProvider>
          <SimplifiedAuthProvider>
            <StoreProvider>
              <React.Suspense fallback={<LoadingFallback message="Loading application..." />}>
                <Toaster />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/pos" element={<ProtectedRoute requireStoreAccess><PosPage /></ProtectedRoute>} />
                  <Route path="/products" element={<ProtectedRoute requireStoreAccess><ProductsPage /></ProtectedRoute>} />
                  <Route path="/customers" element={<ProtectedRoute requireStoreAccess><CustomersPage /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute requireStoreAccess><ReportsPage /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute requireStoreAccess><OrderManagementPage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/settings/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
                  <Route path="/settings/stores" element={<ProtectedRoute><StoresPage /></ProtectedRoute>} />
                  <Route path="/inventory" element={<ProtectedRoute requireStoreAccess><InventoryPage /></ProtectedRoute>} />
                  <Route path="/production" element={<ProtectedRoute requireStoreAccess><ProductionPage /></ProtectedRoute>} />
                  <Route path="/commissary" element={<ProtectedRoute><CommissaryInventoryPage /></ProtectedRoute>} />
                  <Route path="/stock-orders" element={<ProtectedRoute requireStoreAccess><StockOrdersManagement /></ProtectedRoute>} />
                  <Route path="/security" element={<ProtectedRoute requiredRole="admin"><SecurityMonitoringDashboard /></ProtectedRoute>} />
                </Routes>
              </React.Suspense>
            </StoreProvider>
          </SimplifiedAuthProvider>
        </SecurityAuditProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
