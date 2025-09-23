import { AppSidebar } from '@/components/organisms/AppSidebar';
import { TopBar } from '@/components/organisms/TopBar';
import { GlobalWidgetBar } from '@/components/organisms/GlobalWidgetBar';
import { SpendingChartsDisplay } from '@/components/organisms/SpendingChartsDisplay';

export function ChartsPage() {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-4 overflow-auto">
          <SpendingChartsDisplay />
        </main>
        <GlobalWidgetBar />
      </div>
    </div>
  );
}
