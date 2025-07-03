
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
const Expenses = React.lazy(() => import('@/pages/Expenses'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const ProductCatalog = React.lazy(() => import('@/pages/ProductCatalog'));
const StockOrders = React.lazy(() => import('@/pages/StockOrders'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

export const MainAppRoutes = () => {
  return (
    <>
      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <POS />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <Products />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <ProductCatalog />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <Inventory />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <StockOrders />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <ProductionManagement />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <CommissaryInventory />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <InventoryConversion />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <OrderManagement />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <Reports />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Expenses */}
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <Expenses />
              </React.Suspense>
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
              <React.Suspense fallback={<LoadingSpinner />}>
                <Settings />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

    </>
  );
};
