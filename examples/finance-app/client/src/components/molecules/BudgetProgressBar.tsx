import { Progress } from '../atoms/progress';
import { Card, CardContent } from '../atoms/card';

export interface BudgetProgressBarProps {
  currentSpent: number;
  totalBudget: number;
  period?: 'weekly' | 'monthly';
  className?: string;
}

export function BudgetProgressBar({
  currentSpent,
  totalBudget,
  period = 'monthly',
  className = '',
}: BudgetProgressBarProps) {
  const percentage = Math.min((currentSpent / totalBudget) * 100, 100);
  const remaining = Math.max(totalBudget - currentSpent, 0);
  const isOverBudget = currentSpent > totalBudget;

  console.log('BudgetProgressBar render:', { currentSpent, totalBudget, percentage, remaining, isOverBudget });

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground capitalize">{period} Budget</span>
          <span className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
            ${currentSpent.toFixed(2)} / ${totalBudget.toFixed(2)}
          </span>
        </div>

        <Progress value={percentage} className="h-2" />

        <div className="flex justify-between items-center text-xs">
          <span className={`${isOverBudget ? 'text-destructive' : 'text-primary'} font-medium`}>
            {isOverBudget
              ? `Over by $${(currentSpent - totalBudget).toFixed(2)}`
              : `$${remaining.toFixed(2)} remaining`}
          </span>
          <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
