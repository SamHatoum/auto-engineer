import { ApolloProvider } from '@apollo/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { apolloClient } from '@/apolloClient';
import { Index } from '@/pages/Index';
import { NotFound } from '@/pages/NotFound';
import { QuestionnairePage } from '@/pages/QuestionnairePage';

export const App = () => (
  <ApolloProvider client={apolloClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/q/:questionnaireId" element={<QuestionnairePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </ApolloProvider>
);
