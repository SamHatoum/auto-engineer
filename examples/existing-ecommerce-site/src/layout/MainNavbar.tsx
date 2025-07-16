import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@examples/existing-design-system/components/ui/navigation-menu';
import { Input } from '@examples/existing-design-system/components/ui/input';
import { Button } from '@examples/existing-design-system/components/ui/button';

import { Search, ShoppingCart, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MainNavbar() {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-background border-b">
      <div className="max-w-screen-xl mx-auto px-6 h-[64px] flex items-center justify-between gap-6">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          <img src="/logo.svg" width={32} height={32} />
          <NavigationMenu>
            <NavigationMenuList className="flex gap-6">
              <NavigationMenuItem className="font-semibold">Categories</NavigationMenuItem>
              <NavigationMenuItem>Deals</NavigationMenuItem>
              <NavigationMenuItem>New & featured</NavigationMenuItem>
              <NavigationMenuItem className="font-semibold">Pickup & delivery</NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-2xl relative">
          <Input
            placeholder="What can we help you find?"
            className="rounded-full pl-10 pr-12 h-11 bg-muted shadow-sm"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
        </div>

        {/* Right: Account & Cart */}
        <div className="flex gap-4 items-center">
          <Button variant="ghost" className="flex items-center gap-1 px-2 text-sm font-medium">
            <User className="w-5 h-5" />
            Account
          </Button>
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => {
              navigate('/cart');
            }}
          >
            <ShoppingCart className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
