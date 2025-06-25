
import { useState, useCallback } from 'react';
import { useSecurityAudit } from '@/contexts/auth/SecurityAuditContext';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function useSecurityValidation() {
  const { logSecurityEvent } = useSecurityAudit();
  
  // Email validation
  const validateEmail = useCallback((email: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      }
      
      // Check for suspicious patterns
      if (email.includes('<script>') || email.includes('javascript:')) {
        errors.push('Email contains invalid characters');
        logSecurityEvent('validation_suspicious_email', { email }, 'warning');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [logSecurityEvent]);

  // Password validation
  const validatePassword = useCallback((password: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
    } else {
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
      }
      
      // Check for common weak passwords
      const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'login'];
      if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
        errors.push('Password is too common and easily guessable');
        logSecurityEvent('validation_weak_password_detected', {}, 'warning');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [logSecurityEvent]);

  // Phone number validation
  const validatePhone = useCallback((phone: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!phone) {
      errors.push('Phone number is required');
    } else {
      // Remove common formatting characters
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      // Check if it's a valid phone number (10-15 digits)
      if (!/^\+?[\d]{10,15}$/.test(cleanPhone)) {
        errors.push('Invalid phone number format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Generic input validation (XSS prevention)
  const validateInput = useCallback((input: string, fieldName: string = 'input'): ValidationResult => {
    const errors: string[] = [];
    
    // Check for XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        errors.push(`${fieldName} contains potentially dangerous content`);
        logSecurityEvent('validation_xss_attempt', { 
          field: fieldName, 
          content: input.substring(0, 100) 
        }, 'warning');
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [logSecurityEvent]);

  // Card number validation (basic Luhn algorithm)
  const validateCardNumber = useCallback((cardNumber: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!cardNumber) {
      errors.push('Card number is required');
    } else {
      // Remove spaces and dashes
      const cleanCard = cardNumber.replace(/[\s\-]/g, '');
      
      // Check if it's all digits
      if (!/^\d+$/.test(cleanCard)) {
        errors.push('Card number must contain only digits');
      } else if (cleanCard.length < 13 || cleanCard.length > 19) {
        errors.push('Card number must be between 13 and 19 digits');
      } else {
        // Basic Luhn algorithm check
        let sum = 0;
        let alternate = false;
        
        for (let i = cleanCard.length - 1; i >= 0; i--) {
          let n = parseInt(cleanCard.charAt(i), 10);
          
          if (alternate) {
            n *= 2;
            if (n > 9) {
              n = (n % 10) + 1;
            }
          }
          
          sum += n;
          alternate = !alternate;
        }
        
        if (sum % 10 !== 0) {
          errors.push('Invalid card number');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  return {
    validateEmail,
    validatePassword,
    validatePhone,
    validateInput,
    validateCardNumber
  };
}
