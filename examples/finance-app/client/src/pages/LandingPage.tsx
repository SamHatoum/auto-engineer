import { LandingHero } from '@/components/organisms/LandingHero';
import { FeaturesSection } from '@/components/organisms/FeaturesSection';
import { TestimonialsSection } from '@/components/organisms/TestimonialsSection';
import { PricingSection } from '@/components/organisms/PricingSection';

// Landing page showcasing app features and pricing
// Specs:
// - display app name and tagline prominently at top of page
// - show a hero image or illustration representing personal finance
// - include a primary call-to-action button to "Get Started" or "Sign Up"
// - include a secondary CTA to "Learn More"
// - list core features with icons: expense tracking, subscriptions, round-up savings, budget tracking, charts
// - display brief descriptions under each feature
// - support horizontal scrolling or 3-column layout for desktop, stacked for mobile
// - show 2-3 user testimonials with names, photos, and quotes
// - highlight real benefits users have gained using the app
// - display simple pricing plans: Free, Premium
// - show plan features in a table or card layout
// - include CTA buttons for each plan: "Start Free" or "Upgrade"
// - include links to About, FAQ, Terms of Service, Privacy Policy, and Contact
// - display social media icons for Twitter, LinkedIn, etc.
// - support smooth scrolling to sections when clicking navigation links
// - be fully responsive for desktop, tablet, and mobile

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHero />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <footer className="border-t bg-muted/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="font-semibold text-primary">FinanceApp</div>
              <p className="text-sm text-muted-foreground">
                Take control of your personal finances with smart tracking and insights.
              </p>
            </div>
            <div className="space-y-4">
              <div className="font-medium">Product</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Features</div>
                <div>Pricing</div>
                <div>FAQ</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="font-medium">Company</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>About</div>
                <div>Contact</div>
                <div>Privacy Policy</div>
                <div>Terms of Service</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="font-medium">Connect</div>
              <div className="flex space-x-4">
                <div className="w-5 h-5 bg-muted rounded"></div>
                <div className="w-5 h-5 bg-muted rounded"></div>
                <div className="w-5 h-5 bg-muted rounded"></div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 FinanceApp. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
