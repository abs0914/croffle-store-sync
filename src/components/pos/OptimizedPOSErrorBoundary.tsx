import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class OptimizedPOSErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error details
    console.error('🚨 POS Error Boundary caught an error:', error, errorInfo);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Show user-friendly toast
    toast.error('Something went wrong with the POS system');

    // Report to monitoring service (if available)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount > 3) {
      toast.error('Too many retries. Please refresh the page.');
      return;
    }

    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: newRetryCount
    });
    
    toast.info(`Retrying... (${newRetryCount}/3)`);
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="w-5 h-5 mr-2" />
                POS System Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">
                  The Point of Sale system encountered an unexpected error. 
                  Don't worry - your data is safe and this can usually be resolved quickly.
                </p>
                
                <div className="bg-gray-100 p-3 rounded text-xs font-mono">
                  <strong>Error:</strong> {this.state.error?.message}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">What you can try:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Click "Try Again" to retry the operation</li>
                  <li>• Refresh the page if the problem persists</li>
                  <li>• Check your internet connection</li>
                  <li>• Contact support if errors continue</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= 3}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={this.handleRefresh}
                  className="flex-1"
                >
                  Refresh Page
                </Button>
              </div>

              {/* Debug Info (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="text-xs">
                  <summary className="cursor-pointer flex items-center text-gray-500">
                    <Bug className="w-3 h-3 mr-1" />
                    Debug Information
                  </summary>
                  <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-32 text-xs">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="text-xs text-gray-500 border-t pt-3">
                <p>
                  <strong>Optimization Status:</strong> Background processing and caching 
                  systems are still active. Previous transactions are safe.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}