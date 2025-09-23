import React from 'react';
import { PricingPlan } from '../molecules/PricingPlan';

export interface PricingSectionProps {
  className?: string;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ className = '' }) => {
  const freePlan = {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['Track unlimited expenses', 'Basic spending charts', 'Monthly budget tracking', 'Round-up savings jar'],
    ctaText: 'Start Free',
    ctaVariant: 'outline' as const,
    popular: false,
  };

  const premiumPlan = {
    name: 'Premium',
    price: '$4.99',
    period: 'per month',
    features: [
      'Everything in Free',
      'Advanced analytics & insights',
      'Subscription tracking',
      'Export data to CSV',
      'Priority support',
      'Custom categories',
    ],
    ctaText: 'Upgrade Now',
    ctaVariant: 'default' as const,
    popular: true,
  };

  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-3xl font-bold text-foreground mb-4">Simple, transparent pricing</div>
          <div className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade when you need more advanced features. No hidden fees, cancel anytime.
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PricingPlan {...freePlan} />
          <PricingPlan {...premiumPlan} />
        </div>

        <div className="text-center mt-12">
          <div className="text-sm text-muted-foreground">
            All plans include secure data encryption and regular backups
          </div>
        </div>
      </div>
    </section>
  );
};
