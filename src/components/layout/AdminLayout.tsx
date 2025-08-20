
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { Spinner } from "../ui/spinner";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminDesktopSidebar } from "./admin/AdminDesktopSidebar";
import { AdminMobileMenuTrigger } from "./admin/AdminMobileMenuTrigger";
import { AdminMobileSidebar } from "./admin/AdminMobileSidebar";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { hasAnyAdminAccess, getAdminSectionFromPath, hasAdminSectionAccess } from "@/utils/adminPermissions";
interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useOrderNotifications();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Check admin access with new permission system
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Check if user has any admin access
      if (!hasAnyAdminAccess(user.role)) {
        navigate("/dashboard");
        return;
      }

      // Check section-specific access
      const currentSection = getAdminSectionFromPath(location.pathname);
      if (currentSection && !hasAdminSectionAccess(user.role, currentSection)) {
        // Redirect to admin dashboard if user can't access this specific section
        navigate("/admin");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, location.pathname, navigate]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-croffle-background">
        <Spinner className="h-8 w-8 text-croffle-accent" />
        <span className="ml-2 text-croffle-primary font-semibold">Loading Admin Panel...</span>
      </div>
    );
  }

  // Don't render anything if not authenticated or doesn't have admin access (will redirect)
  if (!isAuthenticated || !hasAnyAdminAccess(user?.role)) {
    return null;
  }

  // Render admin layout
  return (
    <div className="flex h-screen bg-background" data-component="admin-layout">
      {/* Mobile Menu Trigger */}
      {isMobile && (
        <AdminMobileMenuTrigger onClick={() => setIsMobileMenuOpen(true)} />
      )}
      
      {/* Desktop Sidebar */}
      <AdminDesktopSidebar />
      
      {/* Mobile Sidebar */}
      {isMobile && (
        <AdminMobileSidebar 
          isOpen={isMobileMenuOpen} 
          onOpenChange={setIsMobileMenuOpen} 
        />
      )}
      
      <div className={`flex-1 flex flex-col overflow-hidden ${isMobile ? 'ml-0' : 'ml-64'}`}>
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 bg-croffle-background/30 ${isMobile ? 'pt-16' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
