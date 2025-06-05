
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

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
              </Routes>
            </Router>
          </ShiftProvider>
        </StoreProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
