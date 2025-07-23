import { ApolloProvider } from '@apollo/client';
// import { Toaster } from '@/components/atoms/toaster';
// import { Toaster as Sonner } from '@/components/atoms/sonner';
// import { TooltipProvider } from '@/components/atoms/tooltip';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Index } from '@/pages/Index';
import { NotFound } from '@/pages/NotFound';
import { apolloClient } from '@/apolloClient';

export const App = () => (
  <ApolloProvider client={apolloClient}>
    {/* <TooltipProvider> */}
    {/* <Toaster /> */}
    {/* <Sonner /> */}
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    {/* </TooltipProvider> */}
  </ApolloProvider>
);
