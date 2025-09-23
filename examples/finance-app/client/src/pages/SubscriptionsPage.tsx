import { AppSidebar } from '@/components/organisms/AppSidebar';
import { TopBar } from '@/components/organisms/TopBar';
import { GlobalWidgetBar } from '@/components/organisms/GlobalWidgetBar';
import { SubscriptionManager } from '@/components/organisms/SubscriptionManager';
import { SidebarProvider, SidebarInset } from '@/components/atoms/sidebar';

export function SubscriptionsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <div className="flex flex-col min-h-screen">
          <GlobalWidgetBar />
          <main className="flex-1 p-4 space-y-4">
            <SubscriptionManager />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
