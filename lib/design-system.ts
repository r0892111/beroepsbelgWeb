export const designSystem = {
  colors: {
    neutral: {
      darkest: '#F5F5F5',
      dark: '#F8F8F8',
      base: '#FAFAFA',
      light: '#FCFCFC',
      lighter: '#FFFFFF',
    },
    primary: {
      darkest: '#2ABE7D',
      dark: '#32CC8A',
      base: '#3DD598',
      light: '#5DDDA7',
      lighter: '#7DE5B6',
    },
    text: {
      primary: '#000000',
      secondary: '#3A3A3A',
      tertiary: '#6B6B6B',
      muted: '#8B8B8B',
    },
    surface: {
      elevated1: '#FFFFFF',
      elevated2: '#FEFEFE',
      elevated3: '#FDFDFD',
    }
  },

  shadows: {
    small: {
      light: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
      dark: '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
      combined: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    },
    medium: {
      light: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)',
      dark: '0 4px 8px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
      combined: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), 0 4px 8px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
    },
    large: {
      light: 'inset 0 2px 2px 0 rgba(255, 255, 255, 1)',
      dark: '0 8px 16px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -4px rgba(0, 0, 0, 0.08)',
      combined: 'inset 0 2px 2px 0 rgba(255, 255, 255, 1), 0 8px 16px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -4px rgba(0, 0, 0, 0.08)',
    },
    recessed: {
      top: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      bottom: 'inset 0 -1px 2px 0 rgba(255, 255, 255, 0.6)',
      combined: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06), inset 0 -1px 2px 0 rgba(255, 255, 255, 0.6)',
    },
    glow: {
      small: '0 0 12px rgba(61, 213, 152, 0.3)',
      medium: '0 0 20px rgba(61, 213, 152, 0.4)',
      large: '0 0 32px rgba(61, 213, 152, 0.5)',
    }
  },

  hover: {
    small: {
      shadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 6px 12px -2px rgba(0, 0, 0, 0.1), 0 3px 6px -2px rgba(0, 0, 0, 0.08)',
      lift: 'translateY(-2px)',
    },
    medium: {
      shadow: 'inset 0 2px 2px 0 rgba(255, 255, 255, 1), 0 12px 24px -4px rgba(0, 0, 0, 0.12), 0 6px 12px -4px rgba(0, 0, 0, 0.1)',
      lift: 'translateY(-4px)',
    },
    large: {
      shadow: 'inset 0 2px 3px 0 rgba(255, 255, 255, 1), 0 16px 32px -6px rgba(0, 0, 0, 0.15), 0 8px 16px -6px rgba(0, 0, 0, 0.12)',
      lift: 'translateY(-6px)',
    },
    glowPrimary: {
      shadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), 0 8px 16px -4px rgba(61, 213, 152, 0.3), 0 4px 8px -4px rgba(0, 0, 0, 0.08)',
      lift: 'translateY(-4px)',
    }
  },

  gradients: {
    lightFromTop: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 100%)',
    lightFromBottom: 'linear-gradient(0deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 100%)',
    darkFromTop: 'linear-gradient(180deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0) 100%)',
    darkFromBottom: 'linear-gradient(0deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0) 100%)',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
  }
} as const;

export type DesignSystem = typeof designSystem;
