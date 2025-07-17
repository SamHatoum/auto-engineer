import { CardContent } from '../../../design-system/components/ui/card'; // CardContent will be replaced by a plain div for more control
// No need for `cn` utility for this specific component if not doing complex conditional classes.
import { Button } from '../../../design-system/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../../design-system/components/ui/carousel';
import { useProducts } from '../hooks/useProducts';

export function SummerFindsCarousel() {
  const { data, isLoading, error } = useProducts();

  return (
    <section className="bg-[#e0edeb] py-10">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">Fun new summer finds</h2>

        {isLoading ? (
          <p className="text-center">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-500">Failed to load products.</p>
        ) : (
          <Carousel opts={{ align: 'start' }} className="w-full relative [&>div]:px-0">
            <CarouselContent className="-ml-2 flex gap-2">
              {data?.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                >
                  <ProductCard {...product} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9" />
            <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9" />
          </Carousel>
        )}
      </div>
    </section>
  );
}

interface ProductCardProps {
  name: string;
  price: string;
  imageUrl: string;
}

export function ProductCard({ name, price, imageUrl }: ProductCardProps) {
  return (
    <div
      className="rounded-xl border shadow-none w-[250px] bg-white"
      style={{
        padding: 12,
      }}
    >
      <div className="p-4 flex justify-center">
        <img src={imageUrl} alt={name} className="h-[200px] object-contain rounded-md" />
      </div>
      <CardContent className="pt-0 px-4 pb-4">
        <div className="mb-2">
          <p className="text-sm font-semibold text-gray-800">{price}</p>
          <p className="text-sm h-[100px] text-gray-600 line-clamp-2">{name}</p>
        </div>
        <Button className="w-full bg-red-600 hover:bg-red-700 text-white text-sm rounded-full">
          Add to cart
        </Button>
      </CardContent>
    </div>
  );
}
