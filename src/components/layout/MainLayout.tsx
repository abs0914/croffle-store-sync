
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

  // Verify design compliance in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      verifyDesignCompliance();
    }
  }, []);

  // MainLayout should only focus on layout, auth is handled by ProtectedRoute
  console.log('🏗️ MainLayout: Rendering layout with auth state:', { isAuthenticated, hasUser: !!user });

  // Render main layout - auth is already verified by ProtectedRoute
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
