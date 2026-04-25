'use client';



import { createTheme } from '@mui/material/styles';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#6b7280',
    },
    background: {
      default: '#f8f9f7',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'var(--font-roboto)',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 6px 18px rgba(16,24,40,0.06)',
          '&:hover': {
            boxShadow: '0 10px 30px rgba(16,24,40,0.08)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#007aff',
    },
    background: {
      default: '#000000',
      paper: '#1c1c1e',
    },
  },
   typography: {
    fontFamily: 'var(--font-roboto)',
  },
});

export { lightTheme, darkTheme };