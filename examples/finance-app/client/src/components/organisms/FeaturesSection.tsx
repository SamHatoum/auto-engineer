import React from 'react';
import { FeatureCard } from '../molecules/FeatureCard';

export interface FeaturesSectionProps {
  className?: string;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ className = '' }) => {
  const features = [
    {
      title: 'Expense Tracking',
      description: 'Track every expense with smart categorization and instant insights into your spending patterns.',
      icon: '💰',
    },
    {
      title: 'Subscription Management',
      description: 'Never miss a renewal again. Monitor all your subscriptions and get alerts before charges.',
      icon: '📱',
    },
    {
      title: 'Round-up Savings',
      description: 'Automatically round up purchases and watch your savings grow effortlessly over time.',
      icon: '🏦',
    },
    {
      title: 'Budget Tracking',
      description: 'Set realistic budgets and get real-time updates on your spending to stay on track.',
      icon: '📊',
    },
    {
      title: 'Visual Charts',
      description: 'Beautiful charts and graphs that make understanding your finances simple and clear.',
      icon: '📈',
    },
    {
      title: 'Smart Insights',
      description: 'Get personalized recommendations and insights to optimize your financial health.',
      icon: '🧠',
    },
  ];

  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-3xl font-bold text-foreground mb-4">Everything you need to master your finances</div>
          <div className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools designed to help you track, save, and optimize your money with minimal effort.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} title={feature.title} description={feature.description} icon={feature.icon} />
          ))}
        </div>
      </div>
    </section>
  );
};
