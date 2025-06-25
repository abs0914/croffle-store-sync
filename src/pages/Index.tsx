
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth/SimplifiedAuthProvider";
import { Spinner } from "@/components/ui/spinner";

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    console.log('🏠 Index page - Auth state:', { isAuthenticated, isLoading });
  }, [isAuthenticated, isLoading]);

  // Show loading while checking authentication with timeout protection
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-croffle-background">
        <div className="flex items-center space-x-2">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <span className="text-croffle-primary font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect based on authentication status
  if (isAuthenticated) {
    console.log('🏠 Index: Redirecting to dashboard (authenticated)');
    return <Navigate to="/dashboard" replace />;
  } else {
    console.log('🏠 Index: Redirecting to login (not authenticated)');
    return <Navigate to="/login" replace />;
  }
};

export default Index;
