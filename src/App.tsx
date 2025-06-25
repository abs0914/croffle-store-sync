import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Settings from '@/pages/Settings';
import UsersPage from '@/pages/Settings/Users/UsersPage';
import StoresPage from '@/pages/Settings/Stores/StoresPage';
import ProductsPage from '@/pages/ProductCatalog/ProductsPage';
import CustomersPage from '@/pages/Customers/CustomersPage';
import ReportsPage from '@/pages/Reports/ReportsPage';
import InventoryPage from '@/pages/Inventory/InventoryPage';
import ProductionPage from '@/pages/Production/ProductionPage';
import CommissaryInventoryPage from '@/pages/CommissaryInventory/CommissaryInventoryPage';
import StockOrdersPage from '@/pages/StockOrders/StockOrdersPage';
import PosPage from '@/pages/Pos/PosPage';
import OrderManagementPage from '@/pages/OrderManagement/OrderManagementPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StoreProvider } from '@/contexts/StoreContext';
import { SecurityAuditProvider } from '@/contexts/auth/SecurityAuditContext';
import { EnhancedAuthProvider } from '@/contexts/auth/EnhancedAuthProvider';
import { SecurityMonitoringDashboard } from './components/security/SecurityMonitoringDashboard';

function App() {
  return (
    <BrowserRouter>
      <QueryClient>
        <SecurityAuditProvider>
          <EnhancedAuthProvider>
            <StoreProvider>
              <Toaster />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
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
                <Route path="/stock-orders" element={<ProtectedRoute requireStoreAccess><StockOrdersPage /></ProtectedRoute>} />
                <Route path="/security" element={<ProtectedRoute requiredRole="admin"><SecurityMonitoringDashboard /></ProtectedRoute>} />
              </Routes>
            </StoreProvider>
          </EnhancedAuthProvider>
        </SecurityAuditProvider>
      </QueryClient>
    </BrowserRouter>
  );
}

export default App;
