import { experience, flow, should, specs } from '@auto-engineer/flow';

flow('Beautiful Questionnaire App', 'AUTO-EUVNoohRE', () => {
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
  experience('Home Screen', 'AUTO-aifPcU3hw').client(() => {
    specs('', () => {
      should('show active surveys summary and response rate overview');
      should('display recent survey responses list');
      should('show visual progress of completion rate goals');
      should('quick access buttons for Create Survey, Analytics, Templates');
    });
  });
  experience('Create Survey', 'AUTO-MPviTMrQC').client(() => {
    specs('', () => {
      should('allow entering survey title, description, and question types');
      should('show recent/frequent question templates for quick selection');
      should('display confirmation toast after creating survey');
      should('update survey dashboard and analytics in real-time');
    });
  });
  experience('Response Analytics', 'AUTO-eME978Euk').client(() => {
    specs('', () => {
      should('show daily and weekly response rate charts');
      should('highlight surveys with highest engagement');
      should('allow filtering by survey type or date range');
      should('update dynamically when new responses are received');
    });
  });
  experience('Manage Templates', 'AUTO-TRJBgM1JS').client(() => {
    specs('', () => {
      should('list all survey templates with usage count and last modified date');
      should('allow creating, editing, and deleting survey templates');
      should('show monthly summary of template usage statistics');
      should('highlight most popular and recently used templates');
    });
  });
  experience('Survey Completion Tracker', 'AUTO-oDBBOUNzr').client(() => {
    specs('', () => {
      should('show current completion rate and target progress');
      should('allow setting completion rate targets');
      should('automatically track new survey completions');
      should('display visual completion progress bar consistently in shell');
    });
  });
  experience('Response Goals Tracker', 'AUTO-Idmim68Yf').client(() => {
    specs('', () => {
      should('allow setting monthly/weekly response targets');
      should('show remaining response targets as a progress bar');
      should('highlight underperforming surveys');
      should('update in real-time when responses are received');
    });
  });
  experience('Response History', 'AUTO-cIpwPlqRq').client(() => {
    specs('', () => {
      should('allow viewing full response history');
      should('filter by survey type, date, or completion status');
      should('view detailed response data and export individual responses');
      should('show contribution of each response to daily/weekly/monthly engagement totals');
    });
  });
});
