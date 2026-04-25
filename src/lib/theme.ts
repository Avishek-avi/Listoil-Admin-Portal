import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#10b981',
    },
    background: {
      default: '#f8f9f7',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
    },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 6px 18px rgba(16,24,40,0.06)',
          '&:hover': {
            boxShadow: '0 10px 30px rgba(16,24,40,0.08)',
            transform: 'translateY(-4px)',
          },
          transition: 'box-shadow 200ms ease, transform 160ms ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
        },
        contained: {
          boxShadow: 'none',
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#007aff',
      dark: '#0051d5',
    },
    secondary: {
      main: '#10b981',
    },
    background: {
      default: '#000000',
      paper: 'rgba(28, 28, 30, 0.8)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#f2f2f7',
    },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          backgroundColor: '#141416',
          borderColor: 'rgba(255,255,255,0.03)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
          '&:hover': {
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            transform: 'translateY(-4px)',
          },
          transition: 'box-shadow 200ms ease, transform 160ms ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
        },
        contained: {
          boxShadow: 'none',
        },
      },
    },
  },
});