
/**
 * Design Utilities
 * 
 * These utilities help apply design tokens consistently
 * throughout the application.
 */

import { DESIGN_TOKENS } from './tokens';

// Use this to enforce design tokens in components
export function designToken(path: string): string {
  const parts = path.split('.');
  let value: any = DESIGN_TOKENS;

  for (const part of parts) {
    if (!value[part]) {
      console.warn(`Design System Warning: Token "${path}" not found!`);
      return '';
    }
    value = value[part];
  }

  return value;
}

// Helper to generate Tailwind classes from design tokens
export function designClass(component: string, variant: string = 'default'): string {
  // This would be expanded to handle more complex class generation
  switch (component) {
    case 'sidebar.menuItem':
      return `h-11 px-4 rounded-lg ${variant === 'active' ? 'bg-croffle-accent text-white' : 'hover:bg-croffle-accent/80 hover:text-white text-croffle-text'}`;
    case 'sidebar.header':
      return 'flex flex-col items-center py-6 px-4 border-b bg-gradient-to-r from-croffle-background to-croffle-light';
    case 'sidebar.startShift':
      return 'w-full bg-croffle-accent hover:bg-croffle-accent/90 text-white rounded-md py-3';
    default:
      console.warn(`Design System Warning: Component "${component}" not found!`);
      return '';
  }
}
