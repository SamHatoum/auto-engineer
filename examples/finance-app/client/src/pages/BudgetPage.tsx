import { AppSidebar } from '@/components/organisms/AppSidebar';
import { TopBar } from '@/components/organisms/TopBar';
import { GlobalWidgetBar } from '@/components/organisms/GlobalWidgetBar';
import { BudgetTracker } from '@/components/organisms/BudgetTracker';

export function BudgetPage() {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-4 overflow-auto">
          <BudgetTracker />
        </main>
        <GlobalWidgetBar />
      </div>
    </div>
  );
}
