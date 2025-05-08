import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import Index from "./pages";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import ProductDetails from "./pages/Products/ProductDetails";
import Inventory from "./pages/Inventory";
import Recipe from "./pages/Recipe";
import Stores from "./pages/Stores";
import StoreDetails from "./pages/Stores/StoreDetails";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import RequireAuth from "./components/auth/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import ProductCreate from "./pages/Products/ProductCreate";
import Category from "./pages/Category";
import CategoryDetails from "./pages/Category/CategoryDetails";
import CategoryCreate from "./pages/Category/CategoryCreate";
import CustomerManagement from "./pages/Customers/CustomerManagement";

function App() {
  const { authStatus } = useAuth();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        
        {/* Customer Management */}
        <Route path="/customers" element={<MainLayout><CustomerManagement /></MainLayout>} />
        
        {/* Point of Sale */}
        <Route path="/pos" element={<MainLayout><POS /></MainLayout>} />
        
        {/* Products and Inventory */}
        <Route path="/products" element={<MainLayout><Products /></MainLayout>} />
        <Route path="/products/create" element={<MainLayout><ProductCreate /></MainLayout>} />
        <Route path="/products/:id" element={<MainLayout><ProductDetails /></MainLayout>} />
        <Route path="/inventory" element={<MainLayout><Inventory /></MainLayout>} />
        <Route path="/recipe" element={<MainLayout><Recipe /></MainLayout>} />
        
        {/* Categories */}
        <Route path="/categories" element={<MainLayout><Category /></MainLayout>} />
        <Route path="/categories/create" element={<MainLayout><CategoryCreate /></MainLayout>} />
        <Route path="/categories/:id" element={<MainLayout><CategoryDetails /></MainLayout>} />
        
        {/* Stores */}
        <Route path="/stores" element={<MainLayout><Stores /></MainLayout>} />
        <Route path="/stores/:id" element={<MainLayout><StoreDetails /></MainLayout>} />
        
        {/* Settings */}
        <Route path="/settings" element={<RequireAuth><MainLayout><Settings /></MainLayout></RequireAuth>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
