import { ApolloProvider } from '@apollo/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { apolloClient } from '@/apolloClient';
import { Index } from '@/pages/Index';
import { NotFound } from '@/pages/NotFound';
    import { AssistantChatPage } from '@/pages/AssistantChatPage';
    import { SuggestedItemsPage } from '@/pages/SuggestedItemsPage';

export const App = () => (
    <ApolloProvider client={apolloClient}>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Index />} />
                                    <Route path="/" element={<AssistantChatPage />} />
                                    <Route path="/suggested-items/:sessionId" element={<SuggestedItemsPage />} />
                                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    </ApolloProvider>
);