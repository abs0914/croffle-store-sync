
/**
 * Design Tokens
 * 
 * This file contains all the design tokens used in the application.
 * These tokens are the source of truth for the application's design.
 */

export type DesignTokens = {
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
      logo: {
        width: string;
        height: string;
        [key: string]: string;
      };
      [key: string]: any;
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
      background: "var(--croffle-background)",
      menuItem: {
        height: "2.75rem", // 44px
        padding: "0.5rem 1rem", // 8px 16px
        borderRadius: "0.5rem", // 8px
        activeBackground: "var(--croffle-accent)",
        hoverBackground: "var(--croffle-accent-hover)",
      },
      logo: {
        width: "9rem", // 144px
        height: "9rem", // 144px
      },
      startShift: {
        background: "var(--croffle-accent)",
        color: "white",
        borderRadius: "0.5rem",
      }
    },
  },
};
