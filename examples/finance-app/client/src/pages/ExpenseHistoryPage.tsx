import { AppSidebar } from '@/components/organisms/AppSidebar';
import { TopBar } from '@/components/organisms/TopBar';
import { GlobalWidgetBar } from '@/components/organisms/GlobalWidgetBar';
import { ExpenseHistoryList } from '@/components/organisms/ExpenseHistoryList';
import { AppLayout } from '@/components/templates/app-layout';

// Detailed expense history and management page
// Specs:
// - allow viewing full expense history
// - filter by category, date, or amount
// - edit or delete individual expenses
// - show contribution of each expense to daily/weekly/monthly totals

export function ExpenseHistoryPage() {
  console.log('ExpenseHistoryPage: Rendering expense history page');

  return (
    <AppLayout>
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <GlobalWidgetBar />
        <main className="flex-1 p-4 space-y-4">
          <ExpenseHistoryList />
        </main>
      </div>
    </AppLayout>
  );
}
