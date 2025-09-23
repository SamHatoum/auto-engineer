import { OnboardingFlow } from '@/components/organisms/OnboardingFlow';

export function OnboardingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <OnboardingFlow />
      </div>
    </div>
  );
}
