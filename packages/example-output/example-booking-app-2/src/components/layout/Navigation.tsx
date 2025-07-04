import { Link, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface NavigationProps {
  userRole?: "guest" | "host";
}

const Navigation = ({ userRole = "guest" }: NavigationProps) => {
  const location = useLocation();

  const primaryNavigation = [
    {
      label: "Search",
      route: "/search",
      role: "guest"
    },
    {
      label: "Host Dashboard",
      route: "/host/dashboard",
      role: "host"
    }
  ];

  const secondaryNavigation = [
    {
      label: "Create Listing",
      route: "/host/create-listing",
      role: "host"
    }
  ];

  const isActiveRoute = (route: string) => {
    return location.pathname === route;
  };

  const filteredPrimaryNav = primaryNavigation.filter(item => item.role === userRole);
  const filteredSecondaryNav = secondaryNavigation.filter(item => item.role === userRole);

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-xl font-bold text-gray-900">
            BookingApp
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            {filteredPrimaryNav.map((item) => (
              <Link
                key={item.route}
                to={item.route}
                className={`text-sm font-medium transition-colors ${
                  isActiveRoute(item.route)
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="capitalize">
            {userRole}
          </Badge>
          
          {filteredSecondaryNav.map((item) => (
            <Button
              key={item.route}
              asChild
              variant={isActiveRoute(item.route) ? "default" : "outline"}
              size="sm"
            >
              <Link to={item.route}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
        <div className="flex flex-col space-y-2">
          {filteredPrimaryNav.map((item) => (
            <Link
              key={item.route}
              to={item.route}
              className={`text-sm font-medium py-2 px-3 rounded transition-colors ${
                isActiveRoute(item.route)
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {filteredSecondaryNav.map((item) => (
            <Link
              key={item.route}
              to={item.route}
              className={`text-sm font-medium py-2 px-3 rounded transition-colors ${
                isActiveRoute(item.route)
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;