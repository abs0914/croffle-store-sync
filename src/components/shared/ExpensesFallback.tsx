import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface ExpensesFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  isLoading?: boolean;
  hasStoreAccess?: boolean;
}

export function ExpensesFallback({ 
  error, 
  onRetry, 
  isLoading = false, 
  hasStoreAccess = true 
}: ExpensesFallbackProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Expenses Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base">Loading your expense data...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 md:p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading expenses...</span>
        </div>
      </div>
    );
  }

  // No store access
  if (!hasStoreAccess) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Expenses Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base">Access your business expenses</p>
          </div>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have access to any stores. Please contact your administrator to assign you to a store.
          </AlertDescription>
        </Alert>

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <DollarSign className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>No Store Access</CardTitle>
            <CardDescription>
              You need to be assigned to at least one store to view expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Contact your system administrator to get store access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Expenses Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base">Something went wrong</p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load expense data. Please check your connection and try again.
          </AlertDescription>
        </Alert>

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Error Loading Expenses</CardTitle>
            <CardDescription>
              There was a problem loading your expense data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>This could be due to:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Network connectivity issues</li>
                <li>Server maintenance</li>
                <li>Missing permissions</li>
                <li>Database connection problems</li>
              </ul>
            </div>

            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}

            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Error Details
              </summary>
              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                {error.message || 'Unknown error occurred'}
              </pre>
            </details>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default empty state
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Expenses Dashboard</h1>
          <p className="text-muted-foreground text-sm md:text-base">Track and manage your business expenses</p>
        </div>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <DollarSign className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle>No Expense Data</CardTitle>
          <CardDescription>
            Start tracking your business expenses to see insights here.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}