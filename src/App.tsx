import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Products } from '@/pages/Products';
import { POS } from '@/pages/POS';
import { Settings } from '@/pages/Settings';
import { Auth } from '@/pages/Auth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/auth';
import { Inventory } from '@/pages/Inventory';
import { Customers } from '@/pages/Customers';
import { Orders } from '@/pages/Orders';
import { Stores } from '@/pages/Stores';
import { InventoryManagement } from '@/pages/Inventory/InventoryManagement';
import { CommissaryInventory } from '@/pages/Inventory/CommissaryInventory';
import BulkUpload from "@/pages/BulkUpload";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/auth" element={<Auth />} />
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
                  <Customers />
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
          <Route
            path="/bulk-upload"
            element={
              <ProtectedRoute allowedRoles={["admin", "owner"]}>
                <MainLayout>
                  <BulkUpload />
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
