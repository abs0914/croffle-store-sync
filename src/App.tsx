
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import CustomerManagement from "./pages/Customers/CustomerManagement";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/layout/MainLayout";
import Login from "./pages/Login";
import { AuthProvider } from "./contexts/AuthContext";
import { StoreProvider } from "./contexts/StoreContext";
import { ShiftProvider } from "./contexts/shift";

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ShiftProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
              <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
              <Route path="/customers" element={<MainLayout><CustomerManagement /></MainLayout>} />
              <Route path="/pos" element={<MainLayout><POS /></MainLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster position="top-right" />
          </BrowserRouter>
        </ShiftProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
