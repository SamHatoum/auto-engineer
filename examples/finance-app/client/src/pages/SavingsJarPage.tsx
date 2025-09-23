import { AppSidebar } from '@/components/organisms/AppSidebar';
import { TopBar } from '@/components/organisms/TopBar';
import { GlobalWidgetBar } from '@/components/organisms/GlobalWidgetBar';
import { SavingsJarManager } from '@/components/organisms/SavingsJarManager';
import { AppLayout } from '@/components/templates/app-layout';

// Round-up savings jar management page
// Specs:
// - show current total and goal progress
// - allow changing the savings goal
// - automatically round up new expenses
// - display visual progress bar consistently in shell

export function SavingsJarPage() {
  return (
    <AppLayout>
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-4">
          <SavingsJarManager />
        </main>
        <GlobalWidgetBar />
      </div>
    </AppLayout>
  );
}
