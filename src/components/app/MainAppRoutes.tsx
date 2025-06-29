
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';

// Lazy load components for better performance
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
const StoreForm = React.lazy(() => import('@/pages/Stores/StoreForm'));
const StoreQR = React.lazy(() => import('@/pages/Stores/StoreQR'));
const StoreSettings = React.lazy(() => import('@/pages/Stores/StoreSettings'));
const ProductCatalog = React.lazy(() => import('@/pages/ProductCatalog'));
const StockOrders = React.lazy(() => import('@/pages/StockOrders'));

export const MainAppRoutes = () => {
  return (
    <>
      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* POS */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <MainLayout>
              <POS />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Products */}
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Products />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Product Catalog */}
      <Route
        path="/product-catalog"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductCatalog />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Inventory */}
      <Route
        path="/inventory/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Inventory />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Stock Orders */}
      <Route
        path="/stock-orders"
        element={
          <ProtectedRoute>
            <MainLayout>
              <StockOrders />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Production Management */}
      <Route
        path="/production-management"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductionManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Commissary Inventory */}
      <Route
        path="/commissary-inventory"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CommissaryInventory />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Inventory Conversion */}
      <Route
        path="/inventory-conversion"
        element={
          <ProtectedRoute>
            <MainLayout>
              <InventoryConversion />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Order Management */}
      <Route
        path="/order-management/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <OrderManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Reports */}
      <Route
        path="/reports/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Reports />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings */}
      <Route
        path="/settings/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Settings />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Stores Routes */}
      <Route
        path="/stores"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Stores />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/stores/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <StoreForm />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/stores/edit/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <StoreForm />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/stores/:id/qr"
        element={
          <ProtectedRoute>
            <MainLayout>
              <StoreQR />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/stores/:id/settings"
        element={
          <ProtectedRoute>
            <MainLayout>
              <StoreSettings />
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </>
  );
};
