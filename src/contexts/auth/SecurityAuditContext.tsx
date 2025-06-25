
import React, { createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityAuditContextType {
  logSecurityEvent: (eventType: string, details?: any) => Promise<void>;
}

const SecurityAuditContext = createContext<SecurityAuditContextType | undefined>(undefined);

export function SecurityAuditProvider({ children }: { children: ReactNode }) {
  const logSecurityEvent = async (eventType: string, details?: any) => {
    try {
      const { error } = await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_event_details: details ? JSON.stringify(details) : null,
        p_ip_address: null, // Could be enhanced with IP detection
        p_user_agent: navigator.userAgent
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
