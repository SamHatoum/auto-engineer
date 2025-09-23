import { Card, CardContent, CardHeader, CardTitle } from '../atoms/card';
import { Progress } from '../atoms/progress';

export interface SavingsJarWidgetProps {
  currentAmount: number;
  goalAmount: number;
  className?: string;
}

export function SavingsJarWidget({ currentAmount, goalAmount, className = '' }: SavingsJarWidgetProps) {
  const progressPercentage = goalAmount > 0 ? (currentAmount / goalAmount) * 100 : 0;
  const remainingAmount = Math.max(0, goalAmount - currentAmount);

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Savings Jar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-primary">${currentAmount.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">of ${goalAmount.toFixed(2)}</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <div className="text-xs text-muted-foreground">${remainingAmount.toFixed(2)} remaining to reach goal</div>
      </CardContent>
    </Card>
  );
}
