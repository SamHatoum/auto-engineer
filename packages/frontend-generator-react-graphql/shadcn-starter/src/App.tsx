import { ApolloProvider } from '@apollo/client';
// import { Toaster } from '@/components/atoms/toaster';
// import { Toaster as Sonner } from '@/components/atoms/sonner';
// import { TooltipProvider } from '@/components/atoms/tooltip';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { NotFound } from '@/pages/NotFound';
import { apolloClient } from '@/apolloClient';
import React from 'react';

// Type assertion workaround for React component type issues
const ApolloProviderTyped = ApolloProvider as any;
const RoutesTyped = Routes as any;
const RouteTyped = Route as any;

export const App: React.FC = () => (
  <ApolloProviderTyped client={apolloClient}>
    {/* <TooltipProvider> */}
    {/* <Toaster /> */}
    {/* <Sonner /> */}
    <BrowserRouter>
      <RoutesTyped>
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <RouteTyped path="*" element={<NotFound />} />
      </RoutesTyped>
    </BrowserRouter>
    {/* </TooltipProvider> */}
  </ApolloProviderTyped>
);
