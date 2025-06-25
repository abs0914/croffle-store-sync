
import React from 'react';
import { Spinner } from './spinner';

interface LoadingFallbackProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showSpinner?: boolean;
}

export function LoadingFallback({ 
  message = "Loading...", 
  size = 'md',
  showSpinner = true 
}: LoadingFallbackProps) {
  const sizeClasses = {
    sm: 'h-32',
    md: 'h-64',
    lg: 'h-screen'
  };

  const spinnerSizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]} bg-croffle-background`}>
      <div className="flex flex-col items-center space-y-4">
        {showSpinner && (
          <Spinner className={`${spinnerSizes[size]} text-croffle-accent animate-spin`} />
        )}
        <p className="text-croffle-primary font-medium text-center px-4">
          {message}
        </p>
      </div>
    </div>
  );
}
