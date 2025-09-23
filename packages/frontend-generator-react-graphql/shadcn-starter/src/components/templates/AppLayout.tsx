import { FC, ReactNode } from 'react';

export interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background w-full">
      <div className="flex h-full">
        <AppSidebar className="border border-r h-full" />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <GlobalWidgetBar />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
};
