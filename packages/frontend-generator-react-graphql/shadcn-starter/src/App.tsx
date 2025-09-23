import { ApolloProvider } from '@apollo/client';
// import { Toaster } from '@/components/atoms/toaster';
// import { Toaster as Sonner } from '@/components/atoms/sonner';
// import { TooltipProvider } from '@/components/atoms/tooltip';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Index } from '@/pages/Index';
import { NotFound } from '@/pages/NotFound';
import { apolloClient } from '@/apolloClient';
import React from 'react';
import { SidebarProvider } from '@/components/atoms/sidebar';

// Type assertion workaround for React component type issues
const ApolloProviderTyped = ApolloProvider as any;
const RoutesTyped = Routes as any;
const RouteTyped = Route as any;

export const App: React.FC = () => (
  <SidebarProvider>
    <ApolloProviderTyped client={apolloClient}>
      {/* <TooltipProvider> */}
      {/* <Toaster /> */}
      {/* <Sonner /> */}
      <BrowserRouter>
        <RoutesTyped>
          <RouteTyped path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <RouteTyped path="*" element={<NotFound />} />
        </RoutesTyped>
      </BrowserRouter>
      {/* </TooltipProvider> */}
    </ApolloProviderTyped>
  </SidebarProvider>
);
