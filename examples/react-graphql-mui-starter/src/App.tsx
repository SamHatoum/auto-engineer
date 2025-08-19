import { ApolloProvider } from '@apollo/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Index } from '@/pages/Index';
import { NotFound } from '@/pages/NotFound';
import { apolloClient } from '@/apolloClient';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/theme.ts';

export const App = () => (
  <ApolloProvider client={apolloClient}>
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </ApolloProvider>
);
