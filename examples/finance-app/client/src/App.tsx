import { ApolloProvider } from '@apollo/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { apolloClient } from '@/apolloClient';
import { NotFound } from '@/pages/NotFound';
import { LandingPage } from '@/pages/LandingPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { HomePage } from '@/pages/HomePage';
import { AddExpensePage } from '@/pages/AddExpensePage';
import { ChartsPage } from '@/pages/ChartsPage';
import { SubscriptionsPage } from '@/pages/SubscriptionsPage';
import { SavingsJarPage } from '@/pages/SavingsJarPage';
import { BudgetPage } from '@/pages/BudgetPage';
import { ExpenseHistoryPage } from '@/pages/ExpenseHistoryPage';

export const App = () => (
  <ApolloProvider client={apolloClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/app" element={<HomePage />} />
        <Route path="/app/add-expense" element={<AddExpensePage />} />
        <Route path="/app/charts" element={<ChartsPage />} />
        <Route path="/app/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/app/savings-jar" element={<SavingsJarPage />} />
        <Route path="/app/budget" element={<BudgetPage />} />
        <Route path="/app/expense-history" element={<ExpenseHistoryPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </ApolloProvider>
);
