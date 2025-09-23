import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../atoms/card';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import { Label } from '../atoms/label';
import { Progress } from '../atoms/progress';
import { Badge } from '../atoms/badge';
import { Alert, AlertDescription } from '../atoms/alert';
import { BudgetProgressBar } from '../molecules/BudgetProgressBar';

export interface BudgetTrackerProps {
  className?: string;
}

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({ className }) => {
  const [monthlyBudget, setMonthlyBudget] = useState(2000);
  const [weeklyBudget, setWeeklyBudget] = useState(500);
  const [currentSpending, setCurrentSpending] = useState(1650);
  const [weeklySpending, setWeeklySpending] = useState(380);
  const [isEditing, setIsEditing] = useState(false);
  const [tempBudget, setTempBudget] = useState(monthlyBudget);

  const monthlyRemaining = monthlyBudget - currentSpending;
  const weeklyRemaining = weeklyBudget - weeklySpending;
  const monthlyProgress = (currentSpending / monthlyBudget) * 100;
  const weeklyProgress = (weeklySpending / weeklyBudget) * 100;

  const isMonthlyOverspent = currentSpending > monthlyBudget;
  const isWeeklyOverspent = weeklySpending > weeklyBudget;

  const handleSaveBudget = () => {
    setMonthlyBudget(tempBudget);
    setIsEditing(false);
    console.log('Budget updated:', tempBudget);
  };

  const handleCancelEdit = () => {
    setTempBudget(monthlyBudget);
    setIsEditing(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-2xl font-semibold text-foreground">Budget Tracker</p>
          <p className="text-sm text-muted-foreground">Monitor your spending and stay within budget</p>
        </div>
        <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isEditing}>
          Edit Budget
        </Button>
      </div>

      {(isMonthlyOverspent || isWeeklyOverspent) && (
        <Alert className="border-destructive">
          <AlertDescription>
            {isMonthlyOverspent && "You've exceeded your monthly budget. "}
            {isWeeklyOverspent && "You've exceeded your weekly budget."}
            Consider reviewing your expenses.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">Monthly Budget</p>
              <Badge variant={isMonthlyOverspent ? 'destructive' : 'secondary'}>
                {isMonthlyOverspent ? 'Over Budget' : 'On Track'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="budget-input">Monthly Budget Amount</Label>
                  <Input
                    id="budget-input"
                    type="number"
                    value={tempBudget}
                    onChange={(e) => setTempBudget(Number(e.target.value))}
                    className="text-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveBudget} size="sm">
                    Save
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Spent: ${currentSpending.toLocaleString()}</span>
                    <span>Budget: ${monthlyBudget.toLocaleString()}</span>
                  </div>
                  <BudgetProgressBar current={currentSpending} total={monthlyBudget} className="h-3" />
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold ${isMonthlyOverspent ? 'text-destructive' : 'text-primary'}`}>
                    {isMonthlyOverspent ? '-' : ''}${Math.abs(monthlyRemaining).toLocaleString()}
                    {isMonthlyOverspent ? ' over budget' : ' remaining'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">Weekly Budget</p>
              <Badge variant={isWeeklyOverspent ? 'destructive' : 'secondary'}>
                {isWeeklyOverspent ? 'Over Budget' : 'On Track'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Spent: ${weeklySpending.toLocaleString()}</span>
                <span>Budget: ${weeklyBudget.toLocaleString()}</span>
              </div>
              <BudgetProgressBar current={weeklySpending} total={weeklyBudget} className="h-3" />
            </div>
            <div className="text-center">
              <p className={`text-lg font-semibold ${isWeeklyOverspent ? 'text-destructive' : 'text-primary'}`}>
                {isWeeklyOverspent ? '-' : ''}${Math.abs(weeklyRemaining).toLocaleString()}
                {isWeeklyOverspent ? ' over budget' : ' remaining'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="font-medium">Budget Breakdown</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Daily Average</p>
              <p className="text-lg font-semibold">${(currentSpending / 30).toFixed(0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Days Remaining</p>
              <p className="text-lg font-semibold">12</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Suggested Daily</p>
              <p className="text-lg font-semibold">${(monthlyRemaining / 12).toFixed(0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-lg font-semibold">{monthlyProgress.toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
