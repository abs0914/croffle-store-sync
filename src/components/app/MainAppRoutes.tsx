
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import POS from '@/pages/POS';
import Products from '@/pages/Products';
import ProductCatalog from '@/pages/ProductCatalog';
import Customers from '@/pages/Customers';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import OrderManagement from '@/pages/OrderManagement';
import BulkUpload from '@/pages/BulkUpload';
import Inventory from '@/pages/Inventory';
import InventoryConversion from '@/pages/InventoryConversion';
import ProductionManagement from '@/pages/ProductionManagement';
import CommissaryInventory from '@/pages/CommissaryInventory';
import ProductForm from '@/pages/Inventory/ProductForm';

export const MainAppRoutes: React.FC = () => {
  return (
    <>
      {/* Both root and dashboard routes show the same Dashboard component */}
      <Route path="/" element={
        <ProtectedRoute requireStoreAccess={true}>
          <MainLayout><Dashboard /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute requireStoreAccess={true}>
          <MainLayout><Dashboard /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/pos" element={
        <ProtectedRoute requireStoreAccess={true}>
          <MainLayout><POS /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/product-catalog" element={
        <ProtectedRoute requireStoreAccess={true}>
          <MainLayout><ProductCatalog /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/production" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
          <MainLayout><ProductionManagement /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
          <MainLayout><Inventory /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/inventory/product/new" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
          <MainLayout><ProductForm /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/inventory/product/:id" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
          <MainLayout><ProductForm /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/inventory-conversion" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
          <MainLayout><InventoryConversion /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/bulk-upload" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
          <MainLayout><BulkUpload /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute requireStoreAccess={true}>
          <MainLayout><Customers /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
          <MainLayout><Reports /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
          <MainLayout><Settings /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/order-management" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']} requireStoreAccess={true}>
          <MainLayout><OrderManagement /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/commissary-inventory" element={
        <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
          <MainLayout><CommissaryInventory /></MainLayout>
        </ProtectedRoute>
      } />
    </>
  );
};
