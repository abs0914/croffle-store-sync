
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute';
import { AdminRoutes } from './AdminRoutes';

// Lazy load components for better performance
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const POS = React.lazy(() => import('@/pages/POS'));
const Products = React.lazy(() => import('@/pages/Products'));
const ProductForm = React.lazy(() => import('@/pages/Inventory/ProductForm'));
const Inventory = React.lazy(() => import('@/pages/Inventory'));
const ProductionManagement = React.lazy(() => import('@/pages/ProductionManagement'));
const CommissaryInventory = React.lazy(() => import('@/pages/CommissaryInventory'));
// InventoryConversion removed in favor of direct recipe management
const OrderManagement = React.lazy(() => import('@/pages/OrderManagement/index'));
const Expenses = React.lazy(() => import('@/pages/Expenses'));
const Reports = React.lazy(() => import('@/pages/Reports'));
const Settings = React.lazy(() => import('@/pages/Settings'));

const ProductCatalog = React.lazy(() => import('@/pages/ProductCatalog'));
const StockOrders = React.lazy(() => import('@/pages/StockOrders'));

export const AppRoutes: React.FC = () => {
  return (
    <React.Suspense 
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
        <Route path="/products/edit/:id" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
        <Route path="/inventory/*" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/stock-orders" element={<ProtectedRoute><StockOrders /></ProtectedRoute>} />
        <Route path="/production-management" element={<ProtectedRoute><ProductionManagement /></ProtectedRoute>} />
        <Route path="/commissary-inventory" element={<ProtectedRoute><CommissaryInventory /></ProtectedRoute>} />
        {/* inventory-conversion route removed in favor of direct recipe management */}
        <Route path="/order-management/*" element={<ProtectedRoute><OrderManagement /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
        <Route path="/reports/*" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/settings/*" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminProtectedRoute><AdminRoutes /></AdminProtectedRoute>} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
};
