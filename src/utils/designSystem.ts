
/**
 * Design System Guard Utility
 * 
 * This utility helps enforce consistent design across the application and
 * prevent unintended UI changes without explicit approval.
 * 
 * HOW TO USE:
 * 1. Add data-design-locked="true" attribute to elements that should not be changed
 * 2. Use the DESIGN_TOKENS object for all styling references
 * 3. When making UI changes, check against the design documentation first
 * 
 * IMPORTANT: Any changes to the design system should follow the approval process:
 * 1. Create a visual mockup of proposed changes
 * 2. Get explicit approval from the design owner
 * 3. Document approved changes before implementation
 */

type DesignTokens = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    [key: string]: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    [key: string]: string;
  };
  typography: {
    fontFamily: string;
    heading: {
      fontWeight: string;
      lineHeight: string;
      [key: string]: string;
    };
    body: {
      fontWeight: string;
      lineHeight: string;
      [key: string]: string;
    };
  };
  components: {
    sidebar: {
      width: string;
      background: string;
      menuItem: {
        height: string;
        padding: string;
        borderRadius: string;
        activeBackground: string;
        hoverBackground: string;
        [key: string]: string;
      };
    };
    [key: string]: any;
  };
  [key: string]: any;
};

// Centralized design tokens - this is the source of truth for the application's design
export const DESIGN_TOKENS: DesignTokens = {
  colors: {
    primary: "var(--croffle-primary, #8B5F3C)",
    secondary: "var(--secondary, #F37A1F)",
    accent: "var(--croffle-accent, #F37A1F)",
    background: "var(--croffle-background, #F8EBD8)",
    foreground: "var(--croffle-text, #4A3520)",
    muted: "var(--muted, #6D4B2F)",
    light: "var(--croffle-light, #FDE1D3)",
    dark: "var(--croffle-dark, #6D4B2F)",
  },
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem",  // 8px
    md: "1rem",    // 16px
    lg: "1.5rem",  // 24px
    xl: "2rem",    // 32px
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    heading: {
      fontWeight: "600",
      lineHeight: "1.2",
    },
    body: {
      fontWeight: "400",
      lineHeight: "1.5",
    },
  },
  components: {
    sidebar: {
      width: "16rem", // 256px
      background: "var(--background)",
      menuItem: {
        height: "2.75rem", // 44px
        padding: "0.5rem 1rem", // 8px 16px
        borderRadius: "0.5rem", // 8px
        activeBackground: "var(--secondary)",
        hoverBackground: "var(--croffle-accent)",
      },
    },
  },
};

// This function can be used to check if the current styling matches the approved design
export function verifyDesignCompliance(): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return true; // Only run checks in development
  }

  // Add checks here to validate the current DOM against design specs
  // This is a placeholder for more complex validation
  
  const lockedElements = document.querySelectorAll('[data-design-locked="true"]');
  let compliant = true;

  // Example validation (simplified)
  lockedElements.forEach(element => {
    // Check if element exists and has not been modified
    if (!element) {
      console.error('Design System Error: A locked element is missing!');
      compliant = false;
    }
  });

  return compliant;
}

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
      return `h-11 px-4 rounded-lg ${variant === 'active' ? 'bg-secondary text-white' : 'hover:bg-croffle-accent hover:text-white'}`;
    case 'sidebar.header':
      return 'flex items-center h-16 px-4 border-b bg-gradient-to-r from-croffle-background to-croffle-light';
    default:
      console.warn(`Design System Warning: Component "${component}" not found!`);
      return '';
  }
}

// Add this to the window object in development for easy debugging
if (process.env.NODE_ENV === 'development') {
  (window as any).__DESIGN_SYSTEM__ = {
    tokens: DESIGN_TOKENS,
    verify: verifyDesignCompliance,
    token: designToken,
    class: designClass,
  };

  console.info(
    '%cDesign System Guard Active', 
    'background: #F37A1F; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
    '\nUse window.__DESIGN_SYSTEM__ to access design utilities.'
  );
}
