import React from 'react';
import { BudgetProgressBar } from '../molecules/BudgetProgressBar';
import { SavingsJarWidget } from '../molecules/SavingsJarWidget';

export interface GlobalWidgetBarProps {
  className?: string;
}

export const GlobalWidgetBar: React.FC<GlobalWidgetBarProps> = ({ className = '' }) => {
  console.log('GlobalWidgetBar: Rendering global financial widgets');

  return (
    <div className={`flex items-center justify-between gap-4 p-4 bg-card border-b border-border ${className}`}>
      <div className="flex-1 max-w-md">
        <BudgetProgressBar />
      </div>
      <div className="flex-1 max-w-md">
        <SavingsJarWidget />
      </div>
    </div>
  );
};
