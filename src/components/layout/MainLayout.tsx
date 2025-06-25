
import { ReactNode, useEffect } from "react";
import Sidebar from "./sidebar";
import { useAuth } from "@/contexts/auth";
import { Spinner } from "../ui/spinner";
import { useNavigate } from "react-router-dom";
import { verifyDesignCompliance } from "@/utils/design";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileExpenseFeatures } from "@/hooks/useMobileExpenseFeatures";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  console.log('🏗️ MainLayout rendering');
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isOnline, offlineQueue } = useMobileExpenseFeatures();

  console.log('🏗️ MainLayout state:', {
    isLoading,
    isAuthenticated,
    hasUser: !!user,
    userEmail: user?.email
  });

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

  // TEMPORARY FIX: Skip loading check since ProtectedRoute already handles auth
  // Show loading spinner while checking authentication
  if (isLoading && !isAuthenticated) {
    console.log('🏗️ MainLayout showing loading because auth is incomplete');
    return (
      <div className="flex items-center justify-center min-h-screen bg-croffle-background">
        <Spinner className="h-8 w-8 text-croffle-accent" />
        <span className="ml-2 text-croffle-primary font-semibold">Loading...</span>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    console.log('🏗️ MainLayout: Not authenticated, returning null');
    return null;
  }

  console.log('🏗️ MainLayout: Rendering children');

  // Render main layout if authenticated
  return (
    <div className="flex h-screen bg-background" data-component="main-layout">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile offline indicator */}
        {isMobile && !isOnline && (
          <div className="bg-amber-500 text-white px-4 py-2 text-sm flex items-center justify-between">
            <span>Working offline</span>
            {offlineQueue.length > 0 && (
              <span className="text-xs bg-amber-600 px-2 py-1 rounded">
                {offlineQueue.length} pending
              </span>
            )}
          </div>
        )}
        
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 bg-croffle-background/30 ${isMobile ? 'pt-16' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
