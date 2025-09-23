import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Progress } from '../atoms/Progress';

export interface OnboardingStepProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  showSkip?: boolean;
  children?: React.ReactNode;
}

export function OnboardingStep({
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  nextLabel = 'Continue',
  showSkip = true,
  children,
}: OnboardingStepProps) {
  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </div>
          <Progress value={progressValue} className="w-full" />
        </div>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {children}

          <div className="flex flex-col gap-3">
            {onNext && (
              <Button onClick={onNext} className="w-full" size="lg">
                {nextLabel}
              </Button>
            )}

            {showSkip && onSkip && (
              <Button variant="ghost" onClick={onSkip} className="w-full">
                Skip for now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
