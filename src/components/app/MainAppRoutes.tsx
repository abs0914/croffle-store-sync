
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import POS from '@/pages/POS';
import Products from '@/pages/Products';
import Inventory from '@/pages/Inventory';
import OrderManagement from '@/pages/OrderManagement';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import ExpensesDashboard from '@/pages/Expenses/ExpensesDashboard';
import CustomerManagement from '@/pages/Customers/CustomerManagement';
import ProductCatalog from '@/pages/ProductCatalog';

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
  
  <Route key="product-catalog" path="/product-catalog" element={
    <ProtectedRoute>
      <MainLayout>
        <ProductCatalog />
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

  // Order Management route for managers and above
  <Route key="order-management" path="/order-management" element={
    <ProtectedRoute>
      <MainLayout>
        <OrderManagement />
      </MainLayout>
    </ProtectedRoute>
  } />,

  <Route key="customers" path="/customers" element={
    <ProtectedRoute>
      <MainLayout>
        <CustomerManagement />
      </MainLayout>
    </ProtectedRoute>
  } />,

  // Expense route for managers and above
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
