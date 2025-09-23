import { Card, CardContent } from '../atoms/card';

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-6 text-center hover:shadow-md transition-shadow">
      <CardContent className="space-y-4">
        <div className="flex justify-center text-primary text-3xl">{icon}</div>
        <div className="space-y-2">
          <div className="font-semibold text-foreground">{title}</div>
          <div className="text-sm text-muted-foreground leading-relaxed">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}
