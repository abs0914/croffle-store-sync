import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface CartValidationMessageProps {
  message: string;
}

export function CartValidationMessage({ message }: CartValidationMessageProps) {
  if (!message) return null;

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 flex-shrink-0">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <span className="text-sm text-amber-800">{message}</span>
    </div>
  );
}