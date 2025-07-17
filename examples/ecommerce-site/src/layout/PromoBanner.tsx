// src/components/PromoBanner.tsx
import { Button } from '../../../design-system/components/ui/button'; // Import shadcn/ui Button component

export function PromoBanner() {
  // Named export
  const imageUrl =
    'https://plus.unsplash.com/premium_photo-1726678135880-9fdd5c2daec8?q=80&w=3542&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  return (
    <section className="relative w-full h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden">
      {/* Background Image */}
      <img
        src={imageUrl}
        alt="Spring collection banner"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Content Container (Headline, Subtitle, and Buttons) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 /* Vertical centering */
                      left-4 md:left-8 lg:left-1/4 xl:left-1/3 /* Responsive left alignment */
                      text-white p-4 /* Padding for content block */
                      max-w-md md:max-w-lg lg:max-w-xl /* Max width for text wrapping */"
      >
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 text-left">
          Ready for every
          <br />
          sunny moment.
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl font-semibold mb-6 text-left">
          {' '}
          {/* Added new subtitle */}
          Shop new spring & summer styles
        </p>

        {/* Buttons Container */}
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <Button
            className="px-6 py-3 bg-white text-red-600 border border-red-600 hover:bg-red-50 hover:text-red-700 rounded-md text-lg font-semibold"
            size="lg"
          >
            Shop all women's
          </Button>
          <Button
            className="px-6 py-3 bg-white text-red-600 border border-red-600 hover:bg-red-50 hover:text-red-700 rounded-md text-lg font-semibold"
            size="lg"
          >
            Shop all men's
          </Button>
        </div>
      </div>
    </section>
  );
}
