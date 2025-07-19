// src/components/layout/TopBar.tsx
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from '../../../design-system/components/ui/navigation-menu';
import { Separator } from '../../../design-system/components/ui/separator';

export function TopBar() {
  return (
    <div className="w-full bg-primary text-white text-sm">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-6 h-10">
        {/* Left Side: Location */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            📍 <span>Ship to 81549</span>
          </span>
          <span className="inline-flex items-center gap-1">
            🏬 <span>Beechmont Area</span>
          </span>
        </div>

        {/* Right Side: Nav Links */}
        <NavigationMenu>
          <NavigationMenuList className="flex items-center gap-5">
            <NavigationMenuItem>Rewards</NavigationMenuItem>
            <NavigationMenuItem>Store Card</NavigationMenuItem>
            <NavigationMenuItem>Premium Membership</NavigationMenuItem>
            <NavigationMenuItem>Registry & Wish List</NavigationMenuItem>
            <NavigationMenuItem>Weekly Deals</NavigationMenuItem>
            <NavigationMenuItem>Find Stores</NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <Separator />
    </div>
  );
}
