
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { StoreProvider } from "@/contexts/StoreContext";
import { StoreDisplayProvider } from "@/contexts/StoreDisplayContext";
import { OptimizedCartProvider } from "@/contexts/OptimizedCartContext";
import { ShiftProvider } from "@/contexts/shift";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StoreProvider>
          <OptimizedCartProvider>
            <ShiftProvider>
              <Router>
                <StoreDisplayProvider>
                  {children}
                  <Toaster />
                </StoreDisplayProvider>
              </Router>
            </ShiftProvider>
          </OptimizedCartProvider>
        </StoreProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
