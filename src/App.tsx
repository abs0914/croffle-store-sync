
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Settings from '@/pages/Settings';
import UsersPage from '@/pages/Settings/Users/UsersPage';
import StoresPage from '@/pages/Stores';
import ProductsPage from '@/pages/Products';
import CustomersPage from '@/pages/Customers/CustomerManagement';
import ReportsPage from '@/pages/Reports';
import InventoryPage from '@/pages/Inventory';
import ProductionPage from '@/pages/ProductionManagement';
import CommissaryInventoryPage from '@/pages/CommissaryInventory';
import { StockOrdersManagement } from '@/pages/StockOrders/StockOrdersManagement';
import PosPage from '@/pages/POS';
import OrderManagementPage from '@/pages/OrderManagement';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { StoreProvider } from '@/contexts/StoreContext';
import { SecurityAuditProvider } from '@/contexts/auth/SecurityAuditContext';
import { SimplifiedAuthProvider } from '@/contexts/auth/SimplifiedAuthProvider';
import { SecurityMonitoringDashboard } from './components/security/SecurityMonitoringDashboard';
import { LoadingFallback } from '@/components/ui/LoadingFallback';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthDebugPanel } from '@/components/debug/AuthDebugPanel';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SecurityAuditProvider>
          <SimplifiedAuthProvider>
            <StoreProvider>
              {/* Temporarily remove Suspense to debug loading issues */}
              <div>
                <Toaster />
                <Routes>
                  {/* Root route using Index component for proper auth handling */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />

                  {/* Simple test route */}
                  <Route path="/test" element={
                    <div style={{ padding: '20px', background: 'lightgreen' }}>
                      <h1>Test Route Working!</h1>
                      <p>If you can see this, routing is working.</p>
                    </div>
                  } />

                  {/* Test MainLayout directly without ProtectedRoute */}
                  <Route path="/test-mainlayout-direct" element={
                    (() => {
                      console.log('🔍 Testing MainLayout directly');
                      try {
                        return (
                          <MainLayout>
                            <div style={{ padding: '20px', background: 'purple' }}>
                              <h1>MainLayout Direct Test!</h1>
                              <p>Testing MainLayout without ProtectedRoute.</p>
                            </div>
                          </MainLayout>
                        );
                      } catch (error) {
                        console.error('🔍 Error in MainLayout:', error);
                        return (
                          <div style={{ padding: '20px', background: 'red', color: 'white' }}>
                            <h1>MainLayout Error!</h1>
                            <p>Error: {error.message}</p>
                          </div>
                        );
                      }
                    })()
                  } />
                  
                  {/* Simplified dashboard route for debugging */}
                  <Route path="/dashboard" element={
                    <div style={{ padding: '20px', background: 'lightblue', minHeight: '100vh' }}>
                      <h1>Dashboard Route Working!</h1>
                      <p>This is a simplified dashboard to test routing.</p>
                      <p>If you can see this, the /dashboard route is working.</p>
                    </div>
                  } />

                  {/* Step-by-step debugging routes */}

                  {/* Test ProtectedRoute only */}
                  <Route path="/test-protected" element={
                    <ProtectedRoute>
                      <div style={{ padding: '20px', background: 'yellow' }}>
                        <h1>ProtectedRoute Working!</h1>
                        <p>ProtectedRoute is allowing access.</p>
                      </div>
                    </ProtectedRoute>
                  } />

                  {/* Test ProtectedRoute + MainLayout */}
                  <Route path="/test-layout" element={
                    <ProtectedRoute>
                      {(() => {
                        console.log('🔍 Inside ProtectedRoute children function');
                        return (
                          <MainLayout>
                            {(() => {
                              console.log('🔍 Inside MainLayout children function');
                              return (
                                <div style={{ padding: '20px', background: 'orange' }}>
                                  <h1>MainLayout Working!</h1>
                                  <p>Both ProtectedRoute and MainLayout are working.</p>
                                </div>
                              );
                            })()}
                          </MainLayout>
                        );
                      })()}
                    </ProtectedRoute>
                  } />

                  {/* Original complex dashboard route for comparison */}
                  <Route path="/dashboard-complex" element={
                    <ErrorBoundary>
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <MainLayout>
                            <ErrorBoundary>
                              {(() => {
                                console.log('🏠 Dashboard route element being rendered');
                                return <Dashboard />;
                              })()}
                            </ErrorBoundary>
                          </MainLayout>
                        </ErrorBoundary>
                      </ProtectedRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="/pos" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <PosPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/products" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <ProductsPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/customers" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <CustomersPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/reports" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <ReportsPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/orders" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <OrderManagementPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Settings />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings/users" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <UsersPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings/stores" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <StoresPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/inventory" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <InventoryPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/production" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <ProductionPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/commissary" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <CommissaryInventoryPage />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/stock-orders" element={
                    <ProtectedRoute requireStoreAccess>
                      <MainLayout>
                        <StockOrdersManagement />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/security" element={
                    <ProtectedRoute requiredRole="admin">
                      <MainLayout>
                        <SecurityMonitoringDashboard />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch all - redirect to root for proper auth handling */}
                  <Route path="*" element={<Index />} />
                </Routes>

                {/* Debug panel for development */}
                <AuthDebugPanel />
              </div>
            </StoreProvider>
          </SimplifiedAuthProvider>
        </SecurityAuditProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
