import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/atoms/button';

export const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold text-muted-foreground/20">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">Page not found</h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        <Button 
          onClick={() => window.location.href = '/'}
          className="mt-6"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
};