import { experience, flow, specs, should } from '@auto-engineer/flow';

flow('Micro Personal Finance App', () => {
  // Main App Shell with sidebar layout
  experience('App Structure').client(() => {
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
  experience('Home Screen').client(() => {
    specs(() => {
      should('show today’s spending summary and remaining budget');
      should('display recent expenses list');
      should('show visual progress of savings jar goal');
      should('quick access buttons for Add Expense, Charts, Subscriptions');
    });
  });

  experience('Add Expense').client(() => {
    specs(() => {
      should('allow entering expense amount, category, and note');
      should('show recent/frequent categories for quick selection');
      should('display confirmation toast after adding expense');
      should('update budget bar and charts in real-time');
    });
  });

  experience('Spending Charts').client(() => {
    specs(() => {
      should('show daily and weekly spending charts');
      should('highlight categories with highest spend');
      should('allow filtering by category or date range');
      should('update dynamically when new expenses are added');
    });
  });

  experience('Manage Subscriptions').client(() => {
    specs(() => {
      should('list all active subscriptions with amount and renewal date');
      should('allow adding, editing, and removing subscriptions');
      should('show monthly summary of subscription spending');
      should('highlight upcoming renewals');
    });
  });

  experience('Round-Up Savings Jar').client(() => {
    specs(() => {
      should('show current total and goal progress');
      should('allow changing the savings goal');
      should('automatically round up new expenses');
      should('display visual progress bar consistently in shell');
    });
  });

  experience('Budget Tracker').client(() => {
    specs(() => {
      should('allow setting monthly/weekly budget');
      should('show remaining budget as a progress bar');
      should('highlight overspending');
      should('update in real-time when expenses are added');
    });
  });

  experience('Expense Detail').client(() => {
    specs(() => {
      should('allow viewing full expense history');
      should('filter by category, date, or amount');
      should('edit or delete individual expenses');
      should('show contribution of each expense to daily/weekly/monthly totals');
    });
  });
});
