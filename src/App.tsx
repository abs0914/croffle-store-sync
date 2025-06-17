import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth';
import { StoreProvider } from './contexts/StoreContext';
import { ShiftProvider } from './contexts/shift';
import { CartProvider } from './contexts/cart/CartContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Cashiers from './pages/Cashiers';
import Shifts from './pages/Shifts';
import Stores from './pages/Stores';
import Settings from './pages/Settings';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import OrderManagement from './pages/OrderManagement';
import BulkUpload from './pages/BulkUpload';
import Inventory from './pages/Inventory';
import InventoryConversion from './pages/InventoryConversion';
import ProductionManagement from "./pages/ProductionManagement";

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
                    <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                    <Route path="/pos" element={<ProtectedRoute><Layout><POS /></Layout></ProtectedRoute>} />
                    <Route path="/production" element={<ProtectedRoute><Layout><ProductionManagement /></Layout></ProtectedRoute>} />
                    <Route path="/inventory" element={<ProtectedRoute><Layout><InventoryManagement /></Layout></ProtectedRoute>} />
                    <Route path="/inventory-conversion" element={<ProtectedRoute><Layout><InventoryConversion /></Layout></ProtectedRoute>} />
                    <Route path="/bulk-upload" element={<ProtectedRoute><Layout><BulkUpload /></Layout></ProtectedRoute>} />
                    <Route path="/customers" element={<ProtectedRoute><Layout><Customers /></Layout></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
                    <Route path="/cashiers" element={<ProtectedRoute><Layout><Cashiers /></Layout></ProtectedRoute>} />
                    <Route path="/shifts" element={<ProtectedRoute><Layout><Shifts /></Layout></ProtectedRoute>} />
                    <Route path="/stores" element={<ProtectedRoute><Layout><Stores /></Layout></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
                    <Route path="/order-management" element={<ProtectedRoute><Layout><OrderManagement /></Layout></ProtectedRoute>} />
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
