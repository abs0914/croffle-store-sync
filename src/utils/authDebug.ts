
interface AuthDebugEvent {
  timestamp: Date;
  event: string;
  details: any;
  level: 'info' | 'warning' | 'error';
}

class AuthDebugLogger {
  private events: AuthDebugEvent[] = [];
  private maxEvents = 50;

  log(event: string, details: any = {}, level: 'info' | 'warning' | 'error' = 'info') {
    const logEvent: AuthDebugEvent = {
      timestamp: new Date(),
      event,
      details,
      level
    };
    
    this.events.unshift(logEvent);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      const prefix = level === 'error' ? '🚨' : level === 'warning' ? '⚠️' : '🔐';
      console.log(`${prefix} [Auth Debug] ${event}:`, details);
    }
  }

  getEvents() {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }

  getEventsSummary() {
    const errors = this.events.filter(e => e.level === 'error').length;
    const warnings = this.events.filter(e => e.level === 'warning').length;
    return { total: this.events.length, errors, warnings };
  }
}

export const authDebugger = new AuthDebugLogger();

// Helper function for timeout promises - specifically designed for Supabase queries
export const withTimeout = async <T>(
  queryBuilder: { then: (resolve: (value: T) => void, reject: (reason?: any) => void) => void },
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  return Promise.race([
    new Promise<T>((resolve, reject) => {
      queryBuilder.then(resolve, reject);
    }),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
};
