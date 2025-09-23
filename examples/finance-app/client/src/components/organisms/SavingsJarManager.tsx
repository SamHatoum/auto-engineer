import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../atoms/card';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import { Label } from '../atoms/label';
import { Progress } from '../atoms/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../atoms/dialog';
import { SavingsJarWidget } from '../molecules/SavingsJarWidget';
import { toast } from '../../hooks/use-toast';

export interface SavingsJarManagerProps {
  className?: string;
}

export function SavingsJarManager({ className }: SavingsJarManagerProps) {
  const [currentAmount, setCurrentAmount] = useState(245.67);
  const [goalAmount, setGoalAmount] = useState(1000);
  const [newGoal, setNewGoal] = useState(goalAmount.toString());
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const progressPercentage = (currentAmount / goalAmount) * 100;
  const remainingAmount = goalAmount - currentAmount;

  const handleUpdateGoal = () => {
    const parsedGoal = parseFloat(newGoal);
    if (isNaN(parsedGoal) || parsedGoal <= 0) {
      toast({
        title: 'Invalid goal amount',
        description: 'Please enter a valid positive number',
        variant: 'destructive',
      });
      return;
    }

    setGoalAmount(parsedGoal);
    setIsEditingGoal(false);
    toast({
      title: 'Goal updated',
      description: `Your savings goal has been updated to $${parsedGoal.toFixed(2)}`,
    });
    console.log('Savings goal updated:', parsedGoal);
  };

  const handleWithdraw = () => {
    if (currentAmount > 0) {
      setCurrentAmount(0);
      toast({
        title: 'Savings withdrawn',
        description: `$${currentAmount.toFixed(2)} has been withdrawn from your savings jar`,
      });
      console.log('Savings withdrawn:', currentAmount);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Savings Jar</span>
              <Dialog open={isEditingGoal} onOpenChange={setIsEditingGoal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Edit Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Savings Goal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="goal-amount">Goal Amount ($)</Label>
                      <Input
                        id="goal-amount"
                        type="number"
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        placeholder="Enter goal amount"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateGoal} className="flex-1">
                        Update Goal
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingGoal(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">${currentAmount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">of ${goalAmount.toFixed(2)} goal</div>
            </div>

            <Progress value={progressPercentage} className="h-3" />

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{progressPercentage.toFixed(1)}% complete</span>
              <span className="text-muted-foreground">${remainingAmount.toFixed(2)} remaining</span>
            </div>

            {currentAmount > 0 && (
              <Button variant="outline" onClick={handleWithdraw} className="w-full">
                Withdraw Savings
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="text-lg font-medium">Round-up Settings</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Auto round-up</span>
                <span className="text-sm font-medium text-primary">Enabled</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Automatically rounds up expenses to the nearest dollar and saves the difference
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Recent round-ups</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Coffee - $4.67</span>
                  <span className="text-primary">+$0.33</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Lunch - $12.45</span>
                  <span className="text-primary">+$0.55</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Gas - $45.23</span>
                  <span className="text-primary">+$0.77</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <span className="text-lg font-medium">Savings History</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <div className="text-sm font-medium">Weekly round-ups</div>
                <div className="text-xs text-muted-foreground">Dec 15, 2024</div>
              </div>
              <div className="text-sm font-medium text-primary">+$8.45</div>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <div className="text-sm font-medium">Weekly round-ups</div>
                <div className="text-xs text-muted-foreground">Dec 8, 2024</div>
              </div>
              <div className="text-sm font-medium text-primary">+$12.33</div>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <div className="text-sm font-medium">Weekly round-ups</div>
                <div className="text-xs text-muted-foreground">Dec 1, 2024</div>
              </div>
              <div className="text-sm font-medium text-primary">+$15.67</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
