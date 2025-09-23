import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, CreditCard, History, Home, Menu, PiggyBank, Plus, Target } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Separator } from '../atoms/Separator';
import { Sheet, SheetContent, SheetTrigger } from '../atoms/Sheet';
import { useIsMobile } from '../../hooks/use-mobile';

export interface AppSidebarProps {
  className?: string;
}

const navigationItems = [
  { to: '/app', icon: Home, label: 'Home' },
  { to: '/app/add-expense', icon: Plus, label: 'Add Expense' },
  { to: '/app/charts', icon: BarChart3, label: 'Charts' },
  { to: '/app/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/app/savings-jar', icon: PiggyBank, label: 'Savings Jar' },
  { to: '/app/budget', icon: Target, label: 'Budget' },
  { to: '/app/expense-history', icon: History, label: 'Expense History' },
];

const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
  <div className="flex flex-col h-full p-4">
    <div className="flex items-center gap-2 mb-8">
      <span className="font-semibold text-lg">FinanceApp</span>
    </div>

    <nav className="flex-1 space-y-2">
      {navigationItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onItemClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`
          }
        >
          <Icon size={20} />
          <span className="font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>

    <Separator className="my-4" />

    <div className="text-xs text-muted-foreground px-3">Track your finances with ease</div>
  </div>
);

export const AppSidebar: React.FC<AppSidebarProps> = ({ className }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu size={20} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onItemClick={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className={`w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 ${className}`}>
      <SidebarContent />
    </aside>
  );
};
