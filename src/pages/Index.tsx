
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth/SimplifiedAuthProvider";
import { Spinner } from "@/components/ui/spinner";
import { authDebugger } from "@/utils/authDebug";

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    authDebugger.log('Index page - Auth state check', { isAuthenticated, isLoading });
  }, [isAuthenticated, isLoading]);

  // Show loading while checking authentication with shorter timeout
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
    authDebugger.log('Index: Redirecting to dashboard (authenticated)');
    return <Navigate to="/dashboard" replace />;
  } else {
    authDebugger.log('Index: Redirecting to login (not authenticated)');
    return <Navigate to="/login" replace />;
  }
};

export default Index;
