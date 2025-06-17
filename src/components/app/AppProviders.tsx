
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { StoreProvider } from "@/contexts/StoreContext";
import { StoreDisplayProvider } from "@/contexts/StoreDisplayContext";
import { CartProvider } from "@/contexts/CartContext";
import { ShiftProvider } from "@/contexts/shift";
import { Toaster } from "@/components/ui/sonner";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <StoreProvider>
        <CartProvider>
          <ShiftProvider>
            <Router>
              <StoreDisplayProvider>
                {children}
                <Toaster />
              </StoreDisplayProvider>
            </Router>
          </ShiftProvider>
        </CartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
