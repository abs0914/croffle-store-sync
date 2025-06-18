
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import POS from '@/pages/POS';
import ProductCatalog from '@/pages/ProductCatalog';
import Customers from '@/pages/Customers';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import OrderManagement from '@/pages/OrderManagement';
import Inventory from '@/pages/Inventory';
import ProductionManagement from '@/pages/ProductionManagement';
import StockOrders from '@/pages/StockOrders';
import ProductForm from '@/pages/Inventory/ProductForm';

export const MainAppRoutes = () => [
  // Both root and dashboard routes show the same Dashboard component
  <Route key="root" path="/" element={
    <ProtectedRoute requireStoreAccess={true}>
      <MainLayout><Dashboard /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="dashboard" path="/dashboard" element={
    <ProtectedRoute requireStoreAccess={true}>
      <MainLayout><Dashboard /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="pos" path="/pos" element={
    <ProtectedRoute requireStoreAccess={true}>
      <MainLayout><POS /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="product-catalog" path="/product-catalog" element={
    <ProtectedRoute requireStoreAccess={true}>
      <MainLayout><ProductCatalog /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="stock-orders" path="/stock-orders" element={
    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
      <MainLayout><StockOrders /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="production-management" path="/production-management" element={
    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
      <MainLayout><ProductionManagement /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="inventory" path="/inventory" element={
    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
      <MainLayout><Inventory /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="inventory-product-new" path="/inventory/product/new" element={
    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
      <MainLayout><ProductForm /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="inventory-product-edit" path="/inventory/product/:id" element={
    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
      <MainLayout><ProductForm /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="customers" path="/customers" element={
    <ProtectedRoute requireStoreAccess={true}>
      <MainLayout><Customers /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="reports" path="/reports" element={
    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
      <MainLayout><Reports /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="settings" path="/settings" element={
    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
      <MainLayout><Settings /></MainLayout>
    </ProtectedRoute>
  } />,
  <Route key="order-management" path="/order-management" element={
    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
      <MainLayout><OrderManagement /></MainLayout>
    </ProtectedRoute>
  } />
];
