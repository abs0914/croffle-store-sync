
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth/SimplifiedAuthProvider";
import { Spinner } from "@/components/ui/spinner";
import { authDebugger } from "@/utils/authDebug";

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    console.log('📍 Index page - Auth state check', { isAuthenticated, isLoading });
    authDebugger.log('Index page - Auth state check', { isAuthenticated, isLoading });

    // Reduced timeout to 1 second for Index page
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('📍 Index page loading timeout');
        authDebugger.log('Index page loading timeout', {}, 'warning');
        setShowTimeout(true);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isLoading]);

  // Add detailed logging for render state
  console.log('📍 Index page render state:', { 
    isAuthenticated, 
    isLoading, 
    showTimeout 
  });

  // Show timeout error with navigation options
  if (showTimeout) {
    console.log('📍 Showing timeout error');
    return (
      <div className="flex items-center justify-center min-h-screen bg-croffle-background">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Loading Timeout</h2>
          <p className="text-gray-600 mb-4">
            The application is taking longer than expected to load.
          </p>
          <div className="space-x-2">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication with 1 second timeout
  if (isLoading) {
    console.log('📍 Index page showing loading');
    return (
      <div className="flex items-center justify-center min-h-screen bg-croffle-background">
        <div className="flex items-center space-x-2">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <span className="text-croffle-primary font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect based on authentication status - use replace to avoid history issues
  if (isAuthenticated) {
    console.log('📍 Index: Redirecting to dashboard (authenticated)');
    authDebugger.log('Index: Redirecting to dashboard (authenticated)');
    return <Navigate to="/dashboard" replace />;
  } else {
    console.log('📍 Index: Redirecting to login (not authenticated)');
    authDebugger.log('Index: Redirecting to login (not authenticated)');
    return <Navigate to="/login" replace />;
  }
};

export default Index;
