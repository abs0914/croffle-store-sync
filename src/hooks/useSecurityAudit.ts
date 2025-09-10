import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface SecurityEvent {
  id: string;
  event_type: string;
  user_email: string | null;
  event_data: any;
  risk_level: string;
  created_at: string;
}

interface RateLimitInfo {
  isBlocked: boolean;
  attemptsRemaining: number;
  blockTimeRemaining?: number;
}

export const useSecurityAudit = () => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const logSecurityEvent = async (
    eventType: string,
    eventData: any = {},
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    try {
      const { error } = await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_event_data: eventData,
        p_risk_level: riskLevel
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (err) {
      console.error('Security audit logging error:', err);
    }
  };

  const checkRateLimit = async (
    identifier: string,
    identifierType: 'email' | 'ip' = 'email'
  ): Promise<RateLimitInfo> => {
    try {
      const { data, error } = await supabase.rpc('is_user_rate_limited', {
        p_identifier: identifier,
        p_identifier_type: identifierType
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return { isBlocked: false, attemptsRemaining: 5 };
      }

      return {
        isBlocked: data, // data is true if user is blocked
        attemptsRemaining: data ? 0 : 5
      };
    } catch (err) {
      console.error('Rate limit check error:', err);
      return { isBlocked: false, attemptsRemaining: 5 };
    }
  };

  const fetchSecurityEvents = async () => {
    if (!user || user.role !== 'admin') return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to fetch security events:', error);
      } else {
        setSecurityEvents((data || []).map(event => ({
          ...event,
          user_email: event.user_email || 'Unknown'
        })));
      }
    } catch (err) {
      console.error('Security events fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordStrength = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_password_strength', {
        password
      });

      if (error) {
        console.error('Password validation failed:', error);
        return false;
      }

      return data;
    } catch (err) {
      console.error('Password validation error:', err);
      return false;
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSecurityEvents();
    }
  }, [user]);

  return {
    securityEvents,
    loading,
    logSecurityEvent,
    checkRateLimit,
    fetchSecurityEvents,
    validatePasswordStrength
  };
};