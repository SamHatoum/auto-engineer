import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Progress } from '../atoms/Progress';
import { Badge } from '../atoms/Badge';
import { Separator } from '../atoms/Separator';
import { ExpenseCard } from '../molecules/ExpenseCard';
import { QuickActionButton } from '../molecules/QuickActionButton';
import { SavingsJarWidget } from '../molecules/SavingsJarWidget';
import { BudgetProgressBar } from '../molecules/BudgetProgressBar';

export interface HomeOverviewProps {
  className?: string;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({ className }) => {
  // Mock data - in real app this would come from GraphQL
  const todaySpending = 45.67;
  const remainingBudget = 254.33;
  const budgetProgress = 65;
  const savingsProgress = 78;
  const savingsGoal = 1000;
  const currentSavings = 780;

  const recentExpenses = [
    { id: '1', amount: 12.5, category: 'Food', note: 'Lunch at cafe', date: new Date() },
    { id: '2', amount: 8.99, category: 'Transport', note: 'Bus fare', date: new Date() },
    { id: '3', amount: 24.18, category: 'Groceries', note: 'Weekly shopping', date: new Date() },
  ];

  const handleAddExpense = () => {
    console.log('Navigate to Add Expense');
  };

  const handleViewCharts = () => {
    console.log('Navigate to Charts');
  };

  const handleViewSubscriptions = () => {
    console.log('Navigate to Subscriptions');
  };

  return (
    <div className={`space-y-6 p-6 ${className || ''}`}>
      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Today's Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${todaySpending.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground mt-1">3 transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Remaining Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${remainingBudget.toFixed(2)}</div>
            <BudgetProgressBar progress={budgetProgress} className="mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Savings Jar Widget */}
      <SavingsJarWidget current={currentSavings} goal={savingsGoal} progress={savingsProgress} />

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickActionButton label="Add Expense" variant="primary" onClick={handleAddExpense} />
            <QuickActionButton label="View Charts" variant="secondary" onClick={handleViewCharts} />
            <QuickActionButton label="Subscriptions" variant="secondary" onClick={handleViewSubscriptions} />
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentExpenses.map((expense, index) => (
            <div key={expense.id}>
              <ExpenseCard
                amount={expense.amount}
                category={expense.category}
                note={expense.note}
                date={expense.date}
              />
              {index < recentExpenses.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
          <div className="pt-3">
            <Button variant="outline" className="w-full">
              View All Expenses
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
