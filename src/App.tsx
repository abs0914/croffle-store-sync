
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth';
import { StoreProvider } from './contexts/StoreContext';
import { ShiftProvider } from './contexts/shift';
import { CartProvider } from './contexts/cart/CartProvider';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import OrderManagement from './pages/OrderManagement';
import BulkUpload from './pages/BulkUpload';
import Inventory from './pages/Inventory';
import InventoryConversion from './pages/InventoryConversion';
import ProductionManagement from "./pages/ProductionManagement";
import CommissaryInventory from './pages/CommissaryInventory';
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminStores from './pages/Admin/AdminStores';
import AdminRecipes from './pages/Admin/AdminRecipes';
import AdminCustomers from './pages/Admin/AdminCustomers';
import AdminOrders from './pages/Admin/AdminOrders';
import AdminReports from './pages/Admin/AdminReports';
import { ErrorBoundary } from './components/ErrorBoundary';

// Import modular route components for admin routes
import UsersPage from './pages/Settings/Users/UsersPage';
import CashiersPage from './pages/Settings/Cashiers/CashiersPage';
import ManagersPage from './pages/Settings/Managers/ManagersPage';
import StoresPage from './pages/Stores';
import StoreForm from './pages/Stores/StoreForm';
import StoreQR from './pages/Stores/StoreQR';
import StoreSettings from './pages/Stores/StoreSettings';

const queryClient = new QueryClient();

function App() {
  console.log('App component rendering...');
  
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <StoreProvider>
            <ShiftProvider>
              <CartProvider>
                <QueryClientProvider client={queryClient}>
                  <div className="min-h-screen bg-background">
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
                      <Route path="/pos" element={<ProtectedRoute><MainLayout><POS /></MainLayout></ProtectedRoute>} />
                      <Route path="/production" element={<ProtectedRoute><MainLayout><ProductionManagement /></MainLayout></ProtectedRoute>} />
                      <Route path="/inventory" element={<ProtectedRoute><MainLayout><Inventory /></MainLayout></ProtectedRoute>} />
                      <Route path="/inventory-conversion" element={<ProtectedRoute><MainLayout><InventoryConversion /></MainLayout></ProtectedRoute>} />
                      <Route path="/bulk-upload" element={<ProtectedRoute><MainLayout><BulkUpload /></MainLayout></ProtectedRoute>} />
                      <Route path="/customers" element={<ProtectedRoute><MainLayout><Customers /></MainLayout></ProtectedRoute>} />
                      <Route path="/reports" element={<ProtectedRoute><MainLayout><Reports /></MainLayout></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
                      <Route path="/order-management" element={<ProtectedRoute><MainLayout><OrderManagement /></MainLayout></ProtectedRoute>} />
                      <Route path="/commissary-inventory" element={<ProtectedRoute><MainLayout><CommissaryInventory /></MainLayout></ProtectedRoute>} />
                      
                      {/* Core Admin Routes */}
                      <Route path="/admin" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <AdminDashboard />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      
                      <Route path="/admin/stores" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <AdminStores />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      
                      <Route path="/admin/recipes" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <AdminRecipes />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      
                      <Route path="/admin/customers" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <AdminCustomers />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      
                      <Route path="/admin/orders" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <AdminOrders />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      
                      <Route path="/admin/reports" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <AdminReports />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />

                      <Route path="/admin/bulk-upload" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <BulkUpload />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />

                      <Route path="/admin/commissary-inventory" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <CommissaryInventory />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      
                      <Route path="/admin/order-management" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <OrderManagement />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />

                      {/* Admin User Management Routes */}
                      <Route path="/admin/users" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <UsersPage />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      <Route path="/admin/cashiers" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <CashiersPage />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      <Route path="/admin/managers" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <ManagersPage />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />

                      {/* Admin Store Management Routes */}
                      <Route path="/admin/stores/list" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <StoresPage />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      <Route path="/admin/stores/new" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <StoreForm />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      <Route path="/admin/stores/edit/:id" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <StoreForm />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      <Route path="/admin/stores/:id/qr" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <StoreQR />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                      <Route path="/admin/stores/:id/settings" element={
                        <AdminProtectedRoute>
                          <AdminLayout>
                            <StoreSettings />
                          </AdminLayout>
                        </AdminProtectedRoute>
                      } />
                    </Routes>
                    <Toaster />
                  </div>
                </QueryClientProvider>
              </CartProvider>
            </ShiftProvider>
          </StoreProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
