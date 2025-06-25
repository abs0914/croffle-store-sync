
import React, { createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityAuditContextType {
  logSecurityEvent: (eventType: string, details?: any) => Promise<void>;
}

const SecurityAuditContext = createContext<SecurityAuditContextType | undefined>(undefined);

export function SecurityAuditProvider({ children }: { children: ReactNode }) {
  const logSecurityEvent = async (eventType: string, details?: any) => {
    try {
      // Since the security_audit_log table is not yet in the Supabase types,
      // we'll store security events in a generic format that can be easily migrated
      // For now, we'll just log to console and store basic info
      console.log('Security Event:', { eventType, details, timestamp: new Date().toISOString() });
      
      // We could also store in a temporary table or use RPC call once available
      // For now, just ensure we don't break the app
      
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
