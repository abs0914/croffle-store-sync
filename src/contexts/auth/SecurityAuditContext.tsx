
import React, { createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityAuditContextType {
  logSecurityEvent: (eventType: string, details?: any, severity?: 'info' | 'warning' | 'error' | 'critical') => Promise<void>;
}

const SecurityAuditContext = createContext<SecurityAuditContextType | undefined>(undefined);

export function SecurityAuditProvider({ children }: { children: ReactNode }) {
  const logSecurityEvent = async (
    eventType: string, 
    details?: any, 
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
  ) => {
    try {
      // Get client information for enhanced security logging
      const userAgent = navigator.userAgent;
      const ipAddress = await getClientIP();
      
      // Store in the new persistent security audit log table
      const { error } = await supabase
        .from('security_audit_log')
        .insert({
          event_type: eventType,
          event_details: details,
          ip_address: ipAddress,
          user_agent: userAgent,
          severity: severity
        });

      if (error) {
        console.error('Failed to log security event to database:', error);
      }

      // Also log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SECURITY ${severity.toUpperCase()}] ${eventType}:`, details);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  };

  // Helper function to get client IP (simplified version)
  const getClientIP = async (): Promise<string | null> => {
    try {
      // In production, you might want to use a more sophisticated IP detection
      // For now, we'll return null and let the database handle it
      return null;
    } catch {
      return null;
    }
  };

  return (
    <SecurityAuditContext.Provider value={{ logSecurityEvent }}>
      {children}
    </SecurityAuditContext.Provider>
  );
}

export const useSecurityAudit = () => {
  const context = useContext(SecurityAuditContext);
  if (!context) {
    throw new Error('useSecurityAudit must be used within a SecurityAuditProvider');
  }
  return context;
};
