import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import POS from '@/pages/POS';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import AdminStores from '@/pages/Admin/AdminStores';
import AdminRecipes from '@/pages/Admin/AdminRecipes';
import { AuthProvider } from '@/contexts/auth';
import Inventory from '@/pages/Inventory';
import CustomerManagement from '@/pages/Customers/CustomerManagement';
import Orders from '@/pages/Orders';
import Stores from '@/pages/Stores';
import InventoryManagement from '@/pages/Inventory/InventoryManagement';
import CommissaryInventory from '@/pages/Inventory/CommissaryInventory';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/stores"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminStores />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/recipes"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminRecipes />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            
            {/* Regular Routes */}
            <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Inventory />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory-management"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <InventoryManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/commissary-inventory"
            element={
              <ProtectedRoute allowedRoles={["admin", "owner"]}>
                <MainLayout>
                  <CommissaryInventory />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CustomerManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Orders />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/stores"
            element={
              <ProtectedRoute allowedRoles={["admin", "owner"]}>
                <MainLayout>
                  <Stores />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
