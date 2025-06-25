
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import POS from '@/pages/POS';
import Products from '@/pages/Products';
import Inventory from '@/pages/Inventory';
import Orders from '@/pages/Orders';
import OrderManagement from '@/pages/OrderManagement';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import ExpensesDashboard from '@/pages/Expenses/ExpensesDashboard';

export const MainAppRoutes = () => [
  // Main application routes
  <Route key="dashboard" path="/dashboard" element={
    <ProtectedRoute>
      <MainLayout>
        <Dashboard />
      </MainLayout>
    </ProtectedRoute>
  } />,
  
  <Route key="pos" path="/pos" element={
    <ProtectedRoute>
      <MainLayout>
        <POS />
      </MainLayout>
    </ProtectedRoute>
  } />,
  
  <Route key="products" path="/products" element={
    <ProtectedRoute>
      <MainLayout>
        <Products />
      </MainLayout>
    </ProtectedRoute>
  } />,
  
  <Route key="inventory" path="/inventory" element={
    <ProtectedRoute>
      <MainLayout>
        <Inventory />
      </MainLayout>
    </ProtectedRoute>
  } />,
  
  <Route key="orders" path="/orders" element={
    <ProtectedRoute>
      <MainLayout>
        <Orders />
      </MainLayout>
    </ProtectedRoute>
  } />,

  // New Order Management route for managers and above
  <Route key="order-management" path="/order-management" element={
    <ProtectedRoute>
      <MainLayout>
        <OrderManagement />
      </MainLayout>
    </ProtectedRoute>
  } />,

  // New expense route for stores
  <Route key="expenses" path="/expenses" element={
    <ProtectedRoute>
      <MainLayout>
        <ExpensesDashboard />
      </MainLayout>
    </ProtectedRoute>
  } />,
  
  <Route key="reports" path="/reports" element={
    <ProtectedRoute>
      <MainLayout>
        <Reports />
      </MainLayout>
    </ProtectedRoute>
  } />,
  
  <Route key="settings" path="/settings" element={
    <ProtectedRoute>
      <MainLayout>
        <Settings />
      </MainLayout>
    </ProtectedRoute>
  } />
];
