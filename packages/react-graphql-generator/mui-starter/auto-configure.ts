#!/usr/bin/env tsx
import * as path from 'path';
import { createFile, templatePropsAIMapper } from '@auto-engineer/react-graphql-generator';

const MUIObject = {
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
};

export async function generateTheme() {
  // Ensure process.cwd() is the starter root before calling
  void path.resolve('.');

  await createFile(
    'theme.ts.ejs',
    'theme.ts',
    templatePropsAIMapper('./.context/figma-variables.json', {
      prompt: `
Map them into a valid MUI v7+ createTheme options object. IMPORTANT this is the format I want as output ${JSON.stringify(MUIObject)}

INSTRUCTIONS:
- ONLY respond with the properties requested given to you, try your best to find a figma variable for each one of them, but don't add more than those.
- make sure not to use any methods, only concrete values for example (DONT: "spacing": (factor) => factor * 8}px --- DO: "spacing": 4)

DOCS LINKS:
- https://mui.com/material-ui/customization/palette/
- https://mui.com/material-ui/customization/typography/
- https://mui.com/material-ui/customization/spacing/
- https://mui.com/material-ui/customization/breakpoints/
- https://mui.com/material-ui/customization/z-index/
- https://mui.com/material-ui/customization/transitions/
`,
    }),
  );
}
