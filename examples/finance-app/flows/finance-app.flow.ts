import { experience, flow, specs, should } from '@auto-engineer/flow';

flow('Micro Personal Finance App', 'FIN-A1b2C3d4', () => {
  // Landing Page
  experience('Landing Page', 'FIN-L1a2B3c4').client(() => {
    specs(() => {
      // Hero Section
      should('display app name and tagline prominently at top of page');
      should('show a hero image or illustration representing personal finance');
      should('include a primary call-to-action button to "Get Started" or "Sign Up"');
      should('include a secondary CTA to "Learn More"');

      // Features Section
      should(
        'list core features with icons: expense tracking, subscriptions, round-up savings, budget tracking, charts',
      );
      should('display brief descriptions under each feature');
      should('support horizontal scrolling or 3-column layout for desktop, stacked for mobile');

      // Testimonials Section
      should('show 2-3 user testimonials with names, photos, and quotes');
      should('highlight real benefits users have gained using the app');

      // Pricing Section
      should('display simple pricing plans: Free, Premium');
      should('show plan features in a table or card layout');
      should('include CTA buttons for each plan: "Start Free" or "Upgrade"');

      // Footer Section
      should('include links to About, FAQ, Terms of Service, Privacy Policy, and Contact');
      should('display social media icons for Twitter, LinkedIn, etc.');

      // General Behavior
      should('support smooth scrolling to sections when clicking navigation links');
      should('be fully responsive for desktop, tablet, and mobile');
    });
  });

  // Onboarding Page (optional)
  experience('Onboarding', 'FIN-O1a2B3c4').client(() => {
    specs(() => {
      should('allow user to set initial monthly budget');
      should('allow adding first expense');
      should('allow setting initial savings jar goal');
      should('show visual progress indicators as steps are completed');
      should('allow skipping onboarding to go directly to main app');
    });
  });

  // Main App Shell with sidebar layout
  experience('App Shell', 'FIN-SH1a2B3c4').client(() => {
    specs(() => {
      should('display persistent sidebar on left for navigation');
      should('sidebar includes links: Home, Add Expense, Charts, Subscriptions, Savings Jar, Budget, Expense History');
      should('highlight current active link in sidebar');
      should('sidebar collapsible for smaller screens');
      should('top bar includes app logo, profile menu, and notifications icon');
      should(
        'bottom or top persistent bar shows global widgets: total spending, remaining budget, savings jar progress',
      );
      should('content area changes dynamically based on selected navigation link');
      should('maintain layout consistency across all screens');
      should('support responsive design with sidebar collapsing into hamburger menu on mobile');
    });
  });

  // Experiences under App Shell
  experience('Homepage', 'FIN-H1a2B3c4').client(() => {
    specs(() => {
      should('show today’s spending summary and remaining budget');
      should('display recent expenses list');
      should('show visual progress of savings jar goal');
      should('quick access buttons for Add Expense, Charts, Subscriptions');
    });
  });

  experience('Add Expense', 'FIN-E1a2B3c4').client(() => {
    specs(() => {
      should('allow entering expense amount, category, and note');
      should('show recent/frequent categories for quick selection');
      should('display confirmation toast after adding expense');
      should('update budget bar and charts in real-time');
    });
  });

  experience('Spending Charts', 'FIN-C1a2B3c4').client(() => {
    specs(() => {
      should('show daily and weekly spending charts');
      should('highlight categories with highest spend');
      should('allow filtering by category or date range');
      should('update dynamically when new expenses are added');
    });
  });

  experience('Manage Subscriptions', 'FIN-S1a2B3c4').client(() => {
    specs(() => {
      should('list all active subscriptions with amount and renewal date');
      should('allow adding, editing, and removing subscriptions');
      should('show monthly summary of subscription spending');
      should('highlight upcoming renewals');
    });
  });

  experience('Round-Up Savings Jar', 'FIN-R1a2B3c4').client(() => {
    specs(() => {
      should('show current total and goal progress');
      should('allow changing the savings goal');
      should('automatically round up new expenses');
      should('display visual progress bar consistently in shell');
    });
  });

  experience('Budget Tracker', 'FIN-B1a2B3c4').client(() => {
    specs(() => {
      should('allow setting monthly/weekly budget');
      should('show remaining budget as a progress bar');
      should('highlight overspending');
      should('update in real-time when expenses are added');
    });
  });

  experience('Expense Detail', 'FIN-D1a2B3c4').client(() => {
    specs(() => {
      should('allow viewing full expense history');
      should('filter by category, date, or amount');
      should('edit or delete individual expenses');
      should('show contribution of each expense to daily/weekly/monthly totals');
    });
  });
});
