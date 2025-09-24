import { experience, flow, should, specs } from '@auto-engineer/flow';
flow('Landing Page', 'AUTO-z8hpgv8UU', () => {
  experience('Landing Page', 'AUTO-Ke1xAjRsI').client(() => {
    specs('', () => {
      should('display app name and tagline prominently at top of page');
      should('show a hero image or illustration representing personal finance');
      should('include a primary call-to-action button to "Get Started" or "Sign Up"');
      should('include a secondary CTA to "Learn More"');
      should(
        'list core features with icons: expense tracking, subscriptions, round-up savings, budget tracking, charts',
      );
      should('display brief descriptions under each feature');
      should('support horizontal scrolling or 3-column layout for desktop, stacked for mobile');
      should('show 2-3 user testimonials with names, photos, and quotes');
      should('highlight real benefits users have gained using the app');
      should('display simple pricing plans: Free, Premium');
      should('show plan features in a table or card layout');
      should('include CTA buttons for each plan: "Start Free" or "Upgrade"');
      should('include links to About, FAQ, Terms of Service, Privacy Policy, and Contact');
      should('display social media icons for Twitter, LinkedIn, etc.');
      should('support smooth scrolling to sections when clicking navigation links');
      should('be fully responsive for desktop, tablet, and mobile');
    });
  });
  experience('Onboarding', 'AUTO-krmQIPP30').client(() => {
    specs('', () => {
      should('allow user to set initial monthly budget');
      should('allow adding first expense');
      should('allow setting initial savings jar goal');
      should('show visual progress indicators as steps are completed');
      should('allow skipping onboarding to go directly to main app');
    });
  });
});
