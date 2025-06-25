
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  sanitize?: boolean;
  maskValue?: boolean;
}

export function SecureInput({ 
  label, 
  error, 
  sanitize = true, 
  maskValue = false,
  type = 'text',
  ...props 
}: SecureInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [inputValue, setInputValue] = useState(props.value || '');

  // XSS prevention - basic HTML sanitization
  const sanitizeInput = (value: string): string => {
    if (!sanitize) return value;
    
    return value
      .replace(/[<>]/g, '') // Remove < and > characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };

  // Handle input change with sanitization
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitizedValue = sanitizeInput(rawValue);
    
    setInputValue(sanitizedValue);
    
    // Call original onChange with sanitized value
    if (props.onChange) {
      const modifiedEvent = {
        ...e,
        target: {
          ...e.target,
          value: sanitizedValue
        }
      };
      props.onChange(modifiedEvent);
    }
  };

  // Special handling for card numbers (mask all but last 4 digits)
  const formatCardNumber = (value: string): string => {
    if (!maskValue || value.length < 4) return value;
    
    const lastFour = value.slice(-4);
    const masked = '*'.repeat(value.length - 4);
    return masked + lastFour;
  };

  const displayValue = maskValue && type !== 'password' 
    ? formatCardNumber(inputValue.toString()) 
    : inputValue;

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          {...props}
          type={inputType}
          value={displayValue}
          onChange={handleInputChange}
          className={`${error ? 'border-red-500' : ''} ${props.className || ''}`}
          // Additional security attributes
          autoComplete={type === 'password' ? 'current-password' : props.autoComplete}
          spellCheck={false}
        />
        
        {type === 'password' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
