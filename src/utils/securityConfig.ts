// Security configuration constants
export const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW_MINUTES: 15,
  BLOCK_DURATION_MINUTES: 30,
  
  // Admin email allowlist - update these to your actual admin emails
  ADMIN_EMAILS: [
    'admin@croffle.com',
    'owner@croffle.com'
  ],
  
  // Security headers for API responses
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
} as const;

// Input validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  PASSWORD_STRENGTH: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(-{2})|(\/{2})|(\*\/)|(\*)/i,
  XSS_BASIC: /<script|javascript:|on\w+=/i
} as const;

// Sanitize user input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate input against common attack patterns
export const validateUserInput = (input: string): { isValid: boolean; reason?: string } => {
  if (VALIDATION_PATTERNS.SQL_INJECTION.test(input)) {
    return { isValid: false, reason: 'Invalid characters detected' };
  }
  
  if (VALIDATION_PATTERNS.XSS_BASIC.test(input)) {
    return { isValid: false, reason: 'Invalid script content detected' };
  }
  
  return { isValid: true };
};

// Check if email is in admin allowlist
export const isAdminEmail = (email: string): boolean => {
  const normalizedEmail = email.toLowerCase();
  return SECURITY_CONFIG.ADMIN_EMAILS.some(adminEmail => 
    adminEmail.toLowerCase() === normalizedEmail
  );
};

// Generate secure random string
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};