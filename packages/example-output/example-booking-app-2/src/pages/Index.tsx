import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Welcome to BookingPlatform</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover amazing places to stay or share your property with travelers from around the world.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">Find Your Perfect Stay</CardTitle>
              <CardDescription>
                Search through thousands of unique properties and book your next adventure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/search")} 
                className="w-full"
                size="lg"
              >
                Start Searching
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">Become a Host</CardTitle>
              <CardDescription>
                Share your space and earn money by hosting travelers in your property.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/host/dashboard")} 
                variant="outline"
                className="w-full"
                size="lg"
              >
                Host Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            Join thousands of hosts and guests creating memorable experiences
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;