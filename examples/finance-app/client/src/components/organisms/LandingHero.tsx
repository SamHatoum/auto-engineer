import React from 'react';
import { Button } from '../atoms/Button';
import { QuickActionButton } from '../molecules/QuickActionButton';

export interface LandingHeroProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onGetStarted, onLearnMore }) => {
  return (
    <section className="relative bg-gradient-to-br from-primary/5 to-primary/10 py-24 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-8">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
          <div className="text-5xl font-bold text-foreground mb-4">PennyWise</div>
          <div className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Take control of your finances with smart expense tracking, automatic savings, and insightful spending
            analysis
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <QuickActionButton
            onClick={onGetStarted}
            // variant="primary"
            size="lg"
            label="Get Started Free"
          ></QuickActionButton>
          <Button onClick={onLearnMore} variant="outline" size="lg" className="min-w-[140px]">
            Learn More
          </Button>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="bg-card border rounded-2xl shadow-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="font-semibold text-foreground mb-2">Smart Tracking</div>
                <div className="text-sm text-muted-foreground">
                  Effortlessly track expenses with intelligent categorization
                </div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="font-semibold text-foreground mb-2">Auto Savings</div>
                <div className="text-sm text-muted-foreground">Round up purchases and save automatically</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="font-semibold text-foreground mb-2">Insights</div>
                <div className="text-sm text-muted-foreground">Visualize spending patterns with detailed charts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
