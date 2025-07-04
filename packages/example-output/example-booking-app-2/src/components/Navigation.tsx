import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold">
              BookingPlatform
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/search"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/search") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Search
              </Link>
              <Link
                to="/host/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/host/dashboard") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Host Dashboard
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/host/create-listing">
              <Button
                variant={isActive("/host/create-listing") ? "default" : "outline"}
                size="sm"
              >
                Create Listing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;