import React from 'react';
import { Card, CardContent, CardHeader } from '../atoms/card';
import { Button } from '../atoms/button';
import { Badge } from '../atoms/badge';

export interface PricingPlanProps {
  title: string;
  price: string;
  period?: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
  onCtaClick: () => void;
}

export const PricingPlan: React.FC<PricingPlanProps> = ({
  title,
  price,
  period = 'month',
  features,
  isPopular = false,
  ctaText,
  onCtaClick,
}) => {
  return (
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
        </div>
      )}
      <CardHeader className="text-center pb-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <div className="mt-2">
          <span className="text-3xl font-bold">{price}</span>
          {price !== 'Free' && <span className="text-muted-foreground">/{period}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm">
              <svg className="w-4 h-4 mr-2 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
        <Button
          onClick={onCtaClick}
          className={`w-full mt-6 ${isPopular ? 'bg-primary hover:bg-primary/90' : ''}`}
          variant={isPopular ? 'default' : 'outline'}
        >
          {ctaText}
        </Button>
      </CardContent>
    </Card>
  );
};
