
import React, { createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityAuditContextType {
  logSecurityEvent: (eventType: string, details?: any) => Promise<void>;
}

const SecurityAuditContext = createContext<SecurityAuditContextType | undefined>(undefined);

export function SecurityAuditProvider({ children }: { children: ReactNode }) {
  const logSecurityEvent = async (eventType: string, details?: any) => {
    try {
      // Since the RPC function might not be available yet, we'll insert directly
      const { error } = await supabase
        .from('security_audit_log')
        .insert({
          event_type: eventType,
          event_details: details ? JSON.stringify(details) : null,
          user_agent: navigator.userAgent
        });
      
      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
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
