
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute';
import { AdminRoutes } from './AdminRoutes';

// Lazy load components for better performance with preloading
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const POS = React.lazy(() => import('@/pages/POS'));
const Products = React.lazy(() => import('@/pages/Products'));
const Inventory = React.lazy(() => import('@/pages/Inventory'));
const ProductionManagement = React.lazy(() => import('@/pages/ProductionManagement'));
const CommissaryInventory = React.lazy(() => import('@/pages/CommissaryInventory'));
const InventoryConversion = React.lazy(() => import('@/pages/InventoryConversion'));
const OrderManagement = React.lazy(() => import('@/pages/OrderManagement'));
const Reports = React.lazy(() => import('@/pages/Reports'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const Stores = React.lazy(() => import('@/pages/Stores'));
const ProductCatalog = React.lazy(() => import('@/pages/ProductCatalog'));
const StockOrders = React.lazy(() => import('@/pages/StockOrders'));

// Preload critical components after initial load
const preloadCriticalComponents = () => {
  // Preload Dashboard and POS as they are most commonly accessed
  import('@/pages/Dashboard');
  import('@/pages/POS');
  import('@/pages/Products');
};

// Start preloading after a short delay
setTimeout(preloadCriticalComponents, 2000);

export const AppRoutes: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-gray-600 font-medium">Loading page...</p>
          </div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/product-catalog" element={<ProtectedRoute><ProductCatalog /></ProtectedRoute>} />
        <Route path="/inventory/*" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/stock-orders" element={<ProtectedRoute><StockOrders /></ProtectedRoute>} />
        <Route path="/production-management" element={<ProtectedRoute><ProductionManagement /></ProtectedRoute>} />
        <Route path="/commissary-inventory" element={<ProtectedRoute><CommissaryInventory /></ProtectedRoute>} />
        <Route path="/inventory-conversion" element={<ProtectedRoute><InventoryConversion /></ProtectedRoute>} />
        <Route path="/order-management/*" element={<ProtectedRoute><OrderManagement /></ProtectedRoute>} />
        <Route path="/reports/*" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/settings/*" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/stores/*" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminProtectedRoute><AdminRoutes /></AdminProtectedRoute>} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
};
