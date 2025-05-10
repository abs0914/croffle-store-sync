
import { ReactNode, useEffect } from "react";
import Sidebar from "./sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "../ui/spinner";
import { useNavigate } from "react-router-dom";
import { verifyDesignCompliance } from "@/utils/design";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
    <div className="flex h-screen bg-background" data-component="main-layout">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 bg-croffle-background/30 ${isMobile ? 'pt-16' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
