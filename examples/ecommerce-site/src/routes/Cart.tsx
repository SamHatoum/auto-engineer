import { Button } from '../../../design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../design-system/components/ui/card';
import { TopBar } from '../layout/TopBar';
import { MainNavbar } from '../layout/MainNavbar';
import { useCart } from '../hooks/useCart';

export function Cart() {
  const { data, isLoading, error } = useCart('123');

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-500">Failed to load cart</p>;

  const items = data?.items ?? [];
  const isCartEmpty = items.length === 0;

  return (
    <>
      <TopBar />
      <MainNavbar />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Cart</h1>

        {!isCartEmpty ? (
          <>
            <p className="text-muted-foreground mb-6">
              {/* just sum prices assuming they are in '$XX.XX' format */}
              {items
                .reduce((acc, item) => acc + parseFloat(item.price.replace('$', '')), 0)
                .toFixed(2)}{' '}
              subtotal • {items.length} item{items.length > 1 ? 's' : ''}
            </p>

            {items.map((product) => (
              <Card key={product.id} className="mb-4">
                <CardHeader>
                  <CardTitle className="text-lg">Shipping</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-24 h-24 object-contain rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Button variant="outline" size="sm">
                        Qty 1
                      </Button>
                      <Button variant="ghost" size="sm">
                        Save for later
                      </Button>
                    </div>
                  </div>
                  <div className="text-right font-semibold">{product.price}</div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <Card className="text-center py-16">
            <CardHeader>
              <CardTitle className="text-xl">Your cart is empty</CardTitle>
              <p className="text-sm text-muted-foreground">
                Have an account? Sign in to see your cart
              </p>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white">
                Sign in
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
