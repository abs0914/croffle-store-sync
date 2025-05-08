
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import CustomerManagement from "./pages/Customers/CustomerManagement";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/layout/MainLayout";
import Login from "./pages/Login";
import { useAuth } from "@/contexts/AuthContext";

function App() {
  const { user } = useAuth();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        
        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        
        {/* Customer Management */}
        <Route path="/customers" element={<MainLayout><CustomerManagement /></MainLayout>} />
        
        {/* Point of Sale */}
        <Route path="/pos" element={<MainLayout><POS /></MainLayout>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
