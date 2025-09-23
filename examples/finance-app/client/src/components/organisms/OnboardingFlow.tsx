import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Label } from '../atoms/Label';
import { Progress } from '../atoms/Progress';
import { Textarea } from '../atoms/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../atoms/Select';
import { useToast } from '../../hooks/use-toast';

export interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingData {
  monthlyBudget: string;
  firstExpense: {
    amount: string;
    category: string;
    note: string;
  };
  savingsGoal: string;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    monthlyBudget: '',
    firstExpense: {
      amount: '',
      category: '',
      note: '',
    },
    savingsGoal: '',
  });
  const { toast } = useToast();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Travel',
    'Other',
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    console.log('Onboarding completed with data:', data);
    toast({
      title: 'Welcome aboard!',
      description: 'Your account has been set up successfully.',
    });
    onComplete();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return data.monthlyBudget && parseFloat(data.monthlyBudget) > 0;
      case 2:
        return data.firstExpense.amount && data.firstExpense.category && parseFloat(data.firstExpense.amount) > 0;
      case 3:
        return data.savingsGoal && parseFloat(data.savingsGoal) > 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-medium text-foreground">Set Your Monthly Budget</div>
              <div className="text-sm text-muted-foreground">
                This helps us track your spending and keep you on target
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Monthly Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="2000"
                value={data.monthlyBudget}
                onChange={(e) => setData({ ...data, monthlyBudget: e.target.value })}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-medium text-foreground">Add Your First Expense</div>
              <div className="text-sm text-muted-foreground">Let's get started by recording a recent purchase</div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="25.50"
                  value={data.firstExpense.amount}
                  onChange={(e) =>
                    setData({
                      ...data,
                      firstExpense: { ...data.firstExpense, amount: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={data.firstExpense.category}
                  onValueChange={(value) =>
                    setData({
                      ...data,
                      firstExpense: { ...data.firstExpense, category: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Coffee with friends"
                  value={data.firstExpense.note}
                  onChange={(e) =>
                    setData({
                      ...data,
                      firstExpense: { ...data.firstExpense, note: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-medium text-foreground">Set Your Savings Goal</div>
              <div className="text-sm text-muted-foreground">
                We'll round up your purchases to help you save automatically
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="savings">Savings Goal ($)</Label>
              <Input
                id="savings"
                type="number"
                placeholder="500"
                value={data.savingsGoal}
                onChange={(e) => setData({ ...data, savingsGoal: e.target.value })}
              />
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">
                Every purchase will be rounded up to the nearest dollar, with the difference going to your savings jar.
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-primary">Welcome to FinanceApp</CardTitle>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStep()}

          <div className="flex justify-between space-x-2">
            <div className="flex space-x-2">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
              <Button variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            </div>
            <Button onClick={handleNext} disabled={!isStepValid()} className="min-w-[80px]">
              {currentStep === totalSteps ? 'Complete' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
