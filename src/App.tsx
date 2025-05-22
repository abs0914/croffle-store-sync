
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
import { StoreDisplayProvider } from "./contexts/StoreDisplayContext";
import { CartProvider } from "./contexts/CartContext";
import Stores from "./pages/Stores";
import StoreForm from "./pages/Stores/StoreForm";
import StoreSettings from "./pages/Stores/StoreSettings";
import StoreQR from "./pages/Stores/StoreQR";
import CustomerForm from "./pages/Stores/CustomerForm";
import CustomerFormPreview from "./pages/Stores/CustomerFormPreview";
import InventoryStock from "./pages/Inventory/InventoryStock";
import Inventory from "./pages/Inventory"; 
import Reports from "./pages/Reports"; 
import ProductForm from "./pages/Inventory/ProductForm";
import Cashiers from "./pages/Settings/Cashiers";
import Managers from "./pages/Settings/Managers";
import { useIsMobile } from "./hooks/use-mobile";

function ToasterWithResponsivePosition() {
  const isMobile = useIsMobile();
  return (
    <Toaster 
      position={isMobile ? "top-center" : "top-right"}
      closeButton
      richColors
      expand={isMobile}
      toastOptions={{
        classNames: {
          toast: "group toast rounded-md",
          title: "font-medium text-sm",
          description: "text-xs",
        },
        duration: isMobile ? 4000 : 3000,
      }}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ShiftProvider>
          <CartProvider>
            <BrowserRouter>
              <StoreDisplayProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
                  <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
                  <Route path="/customers" element={<MainLayout><CustomerManagement /></MainLayout>} />
                  <Route path="/pos" element={<MainLayout><POS /></MainLayout>} />
                  <Route path="/stores" element={<MainLayout><Stores /></MainLayout>} />
                  <Route path="/stores/:id" element={<MainLayout><StoreForm /></MainLayout>} />
                  <Route path="/stores/:id/settings" element={<MainLayout><StoreSettings /></MainLayout>} />
                  <Route path="/stores/:id/qr" element={<MainLayout><StoreQR /></MainLayout>} />
                  <Route path="/stores/:id/qr/preview" element={<MainLayout><CustomerFormPreview /></MainLayout>} />
                  <Route path="/customer-form/:storeId" element={<CustomerForm />} />
                  <Route path="/inventory" element={<MainLayout><Inventory /></MainLayout>} />
                  <Route path="/inventory/product/:id" element={<MainLayout><ProductForm /></MainLayout>} />
                  <Route path="/inventory/stock" element={<MainLayout><InventoryStock /></MainLayout>} />
                  <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
                  <Route path="/settings/cashiers" element={<MainLayout><Cashiers /></MainLayout>} />
                  <Route path="/settings/managers" element={<MainLayout><Managers /></MainLayout>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <ToasterWithResponsivePosition />
              </StoreDisplayProvider>
            </BrowserRouter>
          </CartProvider>
        </ShiftProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
