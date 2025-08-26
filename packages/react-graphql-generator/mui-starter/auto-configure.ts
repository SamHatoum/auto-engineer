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

await createFile(
  'theme.ts.ejs',
  'theme.ts',
  templatePropsAIMapper('../.context/figma-variables.json', {
    prompt: `
      - Goal: Map Figma variables into a valid MUI v7+ createTheme options object like this: ${JSON.stringify(MUIObject)}
      - The expected output format is:
        {
          "themeOptions": { ... }
        }
      - Use only the properties explicitly requested in the given MUI object template.
      - If an exact match does not exist, try to find the closest variable, but leave it empty if there’s no good fit.
      - Do NOT include any functions or computed values in the theme, for example:
          - WRONG: "spacing": (factor) => factor * 8
          - CORRECT: "spacing": 4
      - Follow official MUI structure and guidelines for palette, typography, spacing, breakpoints, z-index, and transitions.
    
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
