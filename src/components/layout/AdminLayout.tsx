
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { Spinner } from "../ui/spinner";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminSidebar } from "./admin/AdminSidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Redirect non-admin users
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      navigate("/dashboard");
    }
  }, [isLoading, isAuthenticated, user?.role, navigate]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-croffle-background">
        <Spinner className="h-8 w-8 text-croffle-accent" />
        <span className="ml-2 text-croffle-primary font-semibold">Loading Admin Panel...</span>
      </div>
    );
  }

  // Don't render anything if not authenticated or not admin (will redirect)
  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  // Render admin layout
  return (
    <div className="flex h-screen bg-background" data-component="admin-layout">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 bg-croffle-background/30 ${isMobile ? 'pt-16' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
