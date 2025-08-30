import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    text: {
      primary: '',
      secondary: '',
      disabled: '',
    },
    primary: {
      main: '',
      light: '',
      dark: '',
      contrastText: '',
    },
    secondary: {
      main: '',
      light: '',
      dark: '',
      contrastText: '',
    },
    background: {
      default: '',
      paper: '',
    },
    action: {
      disabled: '',
      active: '',
      focus: '',
      hover: '',
      activatedOpacity: 1,
      disabledBackground: '',
      focusOpacity: 1,
      selected: '',
      disabledOpacity: 1,
      hoverOpacity: 1,
      selectedOpacity: 1,
    },
    error: {
      main: '',
      light: '',
      dark: '',
      contrastText: '',
    },
    warning: {
      main: '',
      light: '',
      dark: '',
      contrastText: '',
    },
    info: {
      main: '',
      light: '',
      dark: '',
      contrastText: '',
    },
    success: {
      main: '',
      light: '',
      dark: '',
      contrastText: '',
    },
    divider: '',
  },
  breakpoints: {
    values: {
      xs: 444,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: 'Roboto',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    fontSize: 16,
  },
});
