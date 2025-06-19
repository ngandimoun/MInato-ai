import { cva } from "class-variance-authority";

// Color palette specific to Living Dossier
export const dossierColors = {
  primary: "hsl(220, 70%, 50%)",
  primaryLight: "hsl(220, 70%, 90%)",
  primaryDark: "hsl(220, 70%, 30%)",
  secondary: "hsl(280, 60%, 50%)",
  secondaryLight: "hsl(280, 60%, 90%)",
  secondaryDark: "hsl(280, 60%, 30%)",
  accent: "hsl(30, 80%, 50%)",
  accentLight: "hsl(30, 80%, 90%)",
  accentDark: "hsl(30, 80%, 30%)",
  success: "hsl(145, 63%, 42%)",
  warning: "hsl(45, 93%, 47%)",
  error: "hsl(0, 91%, 63%)",
  info: "hsl(200, 80%, 50%)",
  background: "hsl(220, 20%, 98%)",
  backgroundDark: "hsl(220, 20%, 10%)",
  surfaceLight: "hsl(0, 0%, 100%)",
  surfaceDark: "hsl(220, 10%, 15%)",
};

// Spacing system
export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem",  // 8px
  md: "1rem",    // 16px
  lg: "1.5rem",  // 24px
  xl: "2rem",    // 32px
  "2xl": "3rem", // 48px
  "3xl": "4rem", // 64px
};

// Typography
export const typography = {
  fontFamily: {
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
  },
  fontSize: {
    xs: "0.75rem",    // 12px
    sm: "0.875rem",   // 14px
    base: "1rem",     // 16px
    lg: "1.125rem",   // 18px
    xl: "1.25rem",    // 20px
    "2xl": "1.5rem",  // 24px
    "3xl": "1.875rem",// 30px
    "4xl": "2.25rem", // 36px
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    none: "1",
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
  },
};

// Shadows
export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
};

// Border radius
export const borderRadius = {
  none: "0",
  sm: "0.125rem", // 2px
  md: "0.25rem",  // 4px
  lg: "0.5rem",   // 8px
  xl: "1rem",     // 16px
  full: "9999px",
};

// Transitions
export const transitions = {
  fast: "150ms",
  normal: "300ms",
  slow: "500ms",
  timing: {
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
};

// Animation classes
export const animationClasses = {
  // Transitions
  fadeIn: "transition-opacity duration-300 ease-in-out",
  fadeOut: "transition-opacity duration-300 ease-in-out",
  slideIn: "transition-transform duration-300 ease-in-out",
  slideOut: "transition-transform duration-300 ease-in-out",
  
  // Animations
  pulse: "animate-pulse",
  spin: "animate-spin",
  bounce: "animate-bounce",
  ping: "animate-ping",
};

// Card variants
export const cardVariants = cva(
  "rounded-lg overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-white dark:bg-gray-800 shadow-md",
        outline: "border border-gray-200 dark:border-gray-700",
        ghost: "hover:bg-gray-50 dark:hover:bg-gray-800",
      },
      size: {
        sm: "p-3",
        md: "p-5",
        lg: "p-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// Button variants
export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Badge variants
export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "text-foreground border border-input hover:bg-accent hover:text-accent-foreground",
        success: "bg-success text-white",
        warning: "bg-warning text-white",
        error: "bg-destructive text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Mobile-specific design tokens
export const mobileDesign = {
  touchTargetSize: "44px", // Minimum touch target size
  bottomNavHeight: "56px",
  headerHeight: "56px",
  safePaddingBottom: "env(safe-area-inset-bottom, 0px)",
  safePaddingTop: "env(safe-area-inset-top, 0px)",
};

// Responsive breakpoints
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};
