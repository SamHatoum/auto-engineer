import { AppSidebar } from '@/components/organisms/AppSidebar';
import { TopBar } from '@/components/organisms/TopBar';
import { GlobalWidgetBar } from '@/components/organisms/GlobalWidgetBar';
import { AddExpenseForm } from '@/components/organisms/AddExpenseForm';
import { AppLayout } from '@/components/templates/app-layout';

// Page for adding new expenses
// Specs:
// - allow entering expense amount, category, and note
// - show recent/frequent categories for quick selection
// - display confirmation toast after adding expense
// - update budget bar and charts in real-time

export function AddExpensePage() {
  return (
    <AppLayout>
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-4">
          <AddExpenseForm />
        </main>
        <GlobalWidgetBar />
      </div>
    </AppLayout>
  );
}
