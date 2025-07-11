
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { Spinner } from "../ui/spinner";
import { useNavigate } from "react-router-dom";
import { verifyDesignCompliance } from "@/utils/design";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileExpenseFeatures } from "@/hooks/useMobileExpenseFeatures";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isOnline, offlineQueue } = useMobileExpenseFeatures();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Verify design compliance in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      verifyDesignCompliance();
    }
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-croffle-background">
        <Spinner className="h-8 w-8 text-croffle-accent" />
        <span className="ml-2 text-croffle-primary font-semibold">Loading...</span>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Render main layout if authenticated
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full bg-background" data-component="main-layout">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with sidebar trigger - only for non-POS pages */}
          {!window.location.pathname.includes('/pos') && (
            <header className="h-12 flex items-center border-b bg-background px-4">
              <SidebarTrigger className="mr-2" />
              <div className="flex-1" />
              {/* Mobile offline indicator */}
              {isMobile && !isOnline && (
                <div className="bg-amber-500 text-white px-3 py-1 text-sm rounded flex items-center gap-2">
                  <span>Offline</span>
                  {offlineQueue.length > 0 && (
                    <span className="text-xs bg-amber-600 px-2 py-1 rounded">
                      {offlineQueue.length}
                    </span>
                  )}
                </div>
              )}
            </header>
          )}
          
          <main className={`flex-1 overflow-hidden ${window.location.pathname.includes('/pos') ? '' : 'p-4 md:p-6 bg-croffle-background/30 overflow-y-auto'}`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
