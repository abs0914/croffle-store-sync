
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth';
import { StoreProvider } from './contexts/StoreContext';
import { ShiftProvider } from './contexts/shift';
import { CartProvider } from './contexts/cart/CartProvider';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import OrderManagement from './pages/OrderManagement';
import BulkUpload from './pages/BulkUpload';
import Inventory from './pages/Inventory';
import InventoryConversion from './pages/InventoryConversion';
import ProductionManagement from "./pages/ProductionManagement";
import { AdminRoutes } from './components/app/AdminRoutes';

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <AuthProvider>
        <StoreProvider>
          <ShiftProvider>
            <CartProvider>
              <QueryClientProvider client={queryClient}>
                <div className="min-h-screen bg-background">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
                    <Route path="/pos" element={<ProtectedRoute><MainLayout><POS /></MainLayout></ProtectedRoute>} />
                    <Route path="/production" element={<ProtectedRoute><MainLayout><ProductionManagement /></MainLayout></ProtectedRoute>} />
                    <Route path="/inventory" element={<ProtectedRoute><MainLayout><Inventory /></MainLayout></ProtectedRoute>} />
                    <Route path="/inventory-conversion" element={<ProtectedRoute><MainLayout><InventoryConversion /></MainLayout></ProtectedRoute>} />
                    <Route path="/bulk-upload" element={<ProtectedRoute><MainLayout><BulkUpload /></MainLayout></ProtectedRoute>} />
                    <Route path="/customers" element={<ProtectedRoute><MainLayout><Customers /></MainLayout></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><MainLayout><Reports /></MainLayout></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
                    <Route path="/order-management" element={<ProtectedRoute><MainLayout><OrderManagement /></MainLayout></ProtectedRoute>} />
                    
                    {/* Admin Routes */}
                    <AdminRoutes />
                  </Routes>
                  <Toaster />
                </div>
              </QueryClientProvider>
            </CartProvider>
          </ShiftProvider>
        </StoreProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
