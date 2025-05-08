
/**
 * Design System
 * 
 * This is the main entry point for the design system.
 * It exports all the utilities and tokens needed for
 * consistent design across the application.
 */

import { DESIGN_TOKENS, DesignTokens } from './tokens';
import { verifyDesignCompliance, setupDevTools } from './verification';
import { designToken, designClass } from './utilities';

// Re-export everything
export {
  DESIGN_TOKENS,
  type DesignTokens,
  verifyDesignCompliance,
  designToken,
  designClass,
};

// Setup development tools
if (process.env.NODE_ENV === 'development') {
  setupDevTools();
  (window as any).__DESIGN_SYSTEM__ = {
    tokens: DESIGN_TOKENS,
    verify: verifyDesignCompliance,
    token: designToken,
    class: designClass,
  };
}
