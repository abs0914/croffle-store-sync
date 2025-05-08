
/**
 * Design System Guard Utility
 * 
 * This is a compatibility file that re-exports the refactored
 * design system. This helps maintain backwards compatibility
 * with existing imports while allowing for a cleaner structure.
 * 
 * HOW TO USE:
 * 1. Add data-design-locked="true" attribute to elements that should not be changed
 * 2. Use the DESIGN_TOKENS object for all styling references
 * 3. When making UI changes, check against the design documentation first
 */

// Re-export everything from the refactored design system
export * from './design';
