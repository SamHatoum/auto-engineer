import { experience, flow, should, specs } from '@auto-engineer/flow';

flow('App Structure', () => {
  experience('App Structure', 'AUTO-k6JkQZQnc').client(() => {
    specs('', () => {
      should('display persistent sidebar on left for navigation');
      should(
        'sidebar includes links: Home, Create Survey, Analytics, Templates, Completion Tracker, Response Goals, Response History',
      );
      should('highlight current active link in sidebar');
      should('sidebar collapsible for smaller screens');
      should('top bar includes app logo, profile menu, and notifications icon');
      should(
        'bottom or top persistent bar shows global widgets: total responses, active surveys, completion rate progress',
      );
      should('content area changes dynamically based on selected navigation link');
      should('maintain layout consistency across all screens');
      should('support responsive design with sidebar collapsing into hamburger menu on mobile');
    });
  });
});
