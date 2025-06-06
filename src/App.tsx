
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider } from "./contexts/auth";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Pos from "./pages/POS";
import Customers from "./pages/Customers";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Inventory from "./pages/Inventory";
import Stores from "./pages/Stores";
import { StoreProvider } from "./contexts/StoreContext";
import { ShiftProvider } from "./contexts/shift";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OrderManagement from "./pages/OrderManagement";
import CommissaryInventory from "./pages/CommissaryInventory";
import InventoryConversion from "./pages/InventoryConversion";

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ShiftProvider>
          <Router>
            <Routes>
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
                path="/pos"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Pos />
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
                path="/order-management"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <OrderManagement />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commissary-inventory"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <MainLayout>
                      <CommissaryInventory />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory-conversion"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <MainLayout>
                      <InventoryConversion />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </ShiftProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
