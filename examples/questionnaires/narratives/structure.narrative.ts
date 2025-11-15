import { experience, narrative, it } from '@auto-engineer/narrative';
narrative('App Structure', 'AUTO-vLkxrmhz6', () => {
  experience('App Structure', 'AUTO-k6JkQZQnc').client(() => {
    it('display persistent sidebar on left for navigation');
    it(
      'sidebar includes links: Home, Create Survey, Analytics, Templates, Completion Tracker, Response Goals, Response History',
    );
    it('highlight current active link in sidebar');
    it('sidebar collapsible for smaller screens');
    it('top bar includes app logo, profile menu, and notifications icon');
    it('bottom or top persistent bar shows global widgets: total responses, active surveys, completion rate progress');
    it('content area changes dynamically based on selected navigation link');
    it('maintain layout consistency across all screens');
    it('support responsive design with sidebar collapsing into hamburger menu on mobile');
  });
});
