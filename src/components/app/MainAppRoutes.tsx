
import React from 'react';
import { Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';

// Lazy load components for better performance
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const POS = React.lazy(() => import('@/pages/POS'));
const Invoice = React.lazy(() => import('@/pages/Invoice'));
const Products = React.lazy(() => import('@/pages/Products'));
const ProductForm = React.lazy(() => import('@/pages/Inventory/ProductForm'));
const Inventory = React.lazy(() => import('@/pages/Inventory'));
const OrderManagement = React.lazy(() => import('@/pages/OrderManagement/index'));
const Reports = React.lazy(() => import('@/pages/Reports'));
const Expenses = React.lazy(() => import('@/pages/Expenses'));
const Settings = React.lazy(() => import('@/pages/Settings'));

// Debug components (development only)
const BluetoothDebugPage = React.lazy(() => import('@/pages/BluetoothDebugPage'));
const StockOrders = React.lazy(() => import('@/pages/StockOrders'));
const SMAccreditationTesting = React.lazy(() => import('@/pages/SMAccreditationTesting'));
const CustomerManagement = React.lazy(() => import('@/pages/Customers/CustomerManagement'));

// WebView components
const PrinterWebView = React.lazy(() => import('@/pages/PrinterWebView'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

export const MainAppRoutes = () => {
  return (
    <>
      {/* Core Store Routes - Optimized Structure */}
      
      {/* Dashboard - Accessible to all authenticated users */}
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

      {/* POS - Accessible to all with store access */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <POS />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Invoice Page - Accessible to all with store access */}
      <Route
        path="/invoice/:transactionId"
        element={
          <ProtectedRoute requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <Invoice />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Products - Unified product management for stores */}
      <Route
        path="/products"
        element={
          <ProtectedRoute requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <Products />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Product Form Routes */}
      <Route
        path="/products/new"
        element={
          <ProtectedRoute requiredRole="manager" requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <ProductForm />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/products/edit/:id"
        element={
          <ProtectedRoute requiredRole="manager" requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <ProductForm />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Inventory - Store inventory management (Managers+) */}
      <Route
        path="/inventory/*"
        element={
          <ProtectedRoute requiredRole="manager" requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <Inventory />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Stock Orders - Store stock management (Managers+) */}
      <Route
        path="/stock-orders"
        element={
          <ProtectedRoute requiredRole="manager" requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <StockOrders />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Order Management - Store order management (Managers+) */}
      <Route
        path="/order-management/*"
        element={
          <ProtectedRoute requiredRole="manager" requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <OrderManagement />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Reports - All with store access */}
      <Route
        path="/reports/*"
        element={
          <ProtectedRoute requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <Reports />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Expenses - All with store access */}
      <Route
        path="/expenses"
        element={
          <ProtectedRoute requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <Expenses />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings - All authenticated users */}
      <Route
        path="/settings"
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

      <Route
        path="/settings/thermal-printer"
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

      {/* SM Accreditation Testing - Admin only */}
      <Route
        path="/sm-accreditation-testing"
        element={
          <ProtectedRoute requiredRole="admin">
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <SMAccreditationTesting />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Customers - All with store access */}
      <Route
        path="/customers"
        element={
          <ProtectedRoute requireStoreAccess>
            <MainLayout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <CustomerManagement />
              </React.Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* WebView Routes - Standalone pages for WebView integration */}
      <Route
        path="/printer-webview"
        element={
          <React.Suspense fallback={<LoadingSpinner />}>
            <PrinterWebView />
          </React.Suspense>
        }
      />

      {/* Debug Routes - Enabled on native builds or when VITE_ENABLE_BLUETOOTH_DEBUG=true */}
      {((import.meta as any).env?.VITE_ENABLE_BLUETOOTH_DEBUG === 'true' || Capacitor.isNativePlatform()) && (
        <Route
          path="/debug/bluetooth"
          element={
            <ProtectedRoute>
              <React.Suspense fallback={<LoadingSpinner />}>
                <BluetoothDebugPage />
              </React.Suspense>
            </ProtectedRoute>
          }
        />
      )}
    </>
  );
};
