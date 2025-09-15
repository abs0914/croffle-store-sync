import { supabase } from "@/integrations/supabase/client";

/**
 * Validates current session and refreshes if needed
 * Critical utility to prevent authentication context loss during queries
 */
export async function ensureValidSession(): Promise<{ 
  isValid: boolean; 
  session: any | null; 
  error?: string;
}> {
  try {
    // Get current session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session validation error:', error);
      return { isValid: false, session: null, error: error.message };
    }
    
    if (!session?.user) {
      console.warn('⚠️ No active session found');
      return { isValid: false, session: null, error: 'No active session' };
    }
    
    // Check if session is about to expire (within 5 minutes)
    const now = Date.now() / 1000;
    const expiresAt = session.expires_at || 0;
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry < 300) { // Less than 5 minutes
      console.log('🔄 Session expiring soon, attempting refresh...');
      
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('❌ Session refresh failed:', refreshError);
          return { 
            isValid: false, 
            session: null, 
            error: refreshError?.message || 'Session refresh failed' 
          };
        }
        
        console.log('✅ Session refreshed successfully');
        return { isValid: true, session: refreshData.session };
      } catch (refreshError) {
        console.error('❌ Session refresh exception:', refreshError);
        return { 
          isValid: false, 
          session: null, 
          error: 'Session refresh failed' 
        };
      }
    }
    
    console.log('✅ Session is valid:', {
      userId: session.user.id.slice(0, 8),
      email: session.user.email,
      expiresIn: Math.round(timeUntilExpiry / 60) + ' minutes'
    });
    
    return { isValid: true, session };
  } catch (error) {
    console.error('❌ Session validation exception:', error);
    return { 
      isValid: false, 
      session: null, 
      error: error instanceof Error ? error.message : 'Session validation failed' 
    };
  }
}

/**
 * Enhanced query wrapper that ensures valid session before executing
 */
export async function executeWithValidSession<T>(
  operation: () => Promise<T>,
  operationName: string = 'query'
): Promise<T> {
  console.log(`🔍 Validating session for ${operationName}...`);
  
  const sessionResult = await ensureValidSession();
  
  if (!sessionResult.isValid) {
    const errorMessage = `Authentication required for ${operationName} - ${sessionResult.error || 'no active session'}`;
    console.error(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }
  
  console.log(`✅ Session valid for ${operationName}, executing...`);
  return await operation();
}