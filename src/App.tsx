
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { CartProvider } from "@/contexts/CartContext";
import { ShiftProvider } from "@/contexts/ShiftContext";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import POS from "./pages/POS";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";
import Stores from "./pages/Stores";
import StoreForm from "./pages/Stores/StoreForm";
import StoreSettings from "./pages/Stores/StoreSettings";
import StoreQR from "./pages/Stores/StoreQR";
import CustomerForm from "./pages/Stores/CustomerForm";
import Inventory from "./pages/Inventory";
import Categories from "./pages/Inventory/Categories";
import ProductForm from "./pages/Inventory/ProductForm";
import InventoryHistory from "./pages/Inventory/InventoryHistory";
import Ingredients from "./pages/Inventory/Ingredients";
import InventoryStock from "./pages/Inventory/InventoryStock";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return null; // Or a loading spinner
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Auth routes component (redirects to dashboard if logged in)
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return null; // Or a loading spinner
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      
      {/* Public Routes - Customer Form */}
      <Route path="/customer-form/:storeId" element={<CustomerForm />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
        
        {/* Menu Management Routes */}
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/inventory/categories" element={<Categories />} />
        <Route path="/inventory/ingredients" element={<Ingredients />} />
        <Route path="/inventory/stock" element={<InventoryStock />} />
        <Route path="/inventory/product/new" element={<ProductForm />} />
        <Route path="/inventory/product/:id" element={<ProductForm />} />
        <Route path="/inventory/history" element={<InventoryHistory />} />
        
        {/* Store Management Routes */}
        <Route path="/stores" element={<Stores />} />
        <Route path="/stores/new" element={<StoreForm />} />
        <Route path="/stores/:id" element={<StoreForm />} />
        <Route path="/stores/:id/settings" element={<StoreSettings />} />
        <Route path="/stores/:id/qr" element={<StoreQR />} />
      </Route>
      
      {/* Catch-all Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <StoreProvider>
          <ShiftProvider>
            <CartProvider>
              <Toaster />
              <Sonner position="top-right" closeButton />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </CartProvider>
          </ShiftProvider>
        </StoreProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
