import { AppSidebar } from '@/components/organisms/AppSidebar';
import { TopBar } from '@/components/organisms/TopBar';
import { GlobalWidgetBar } from '@/components/organisms/GlobalWidgetBar';
import { HomeOverview } from '@/components/organisms/HomeOverview';
import { SidebarProvider } from '@/components/atoms/sidebar';

export function HomePage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <GlobalWidgetBar />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <HomeOverview />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
