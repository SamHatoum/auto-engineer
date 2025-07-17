import { Button } from '../../../design-system/components/ui/button'; // Assuming this is your button component

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Top Green and White Striped Banner */}
      <div
        className="w-full h-4 sm:h-5 md:h-6 lg:h-7 xl:h-8"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Crect x='0' y='0' width='5' height='10' fill='%23A1E2A1'/%3E%3Crect x='5' y='0' width='5' height='10' fill='%23FFFFFF'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
        }}
      />

      {/* Main Hero Content Area */}
      <div className="relative w-full">
        {/* Background Image - Adjusted aspect ratios for more vertical space */}
        {/*
          We need to make the image slightly taller (smaller aspect ratio denominator)
          to accommodate all the text, or give it a minimum height.
          Let's try a blend of aspect ratios and a min-height for robustness.
        */}
        <img
          src="https://plus.unsplash.com/premium_photo-1747763000927-ace791f672ac?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Summer Refresh"
          className="w-full h-auto object-cover min-h-[300px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[450px] xl:min-h-[500px] 2xl:min-h-[550px] aspect-[18/9] sm:aspect-[16/8] md:aspect-[16/7] lg:aspect-[16/6] xl:aspect-[16/5.5] 2xl:aspect-[16/5]" // Adjusted aspect ratios for more height
        />

        {/* Overlayed Text Content */}
        {/*
          Adjusting the 'top' percentage downwards slightly to prevent text from
          going off-screen, and ensuring there's enough room for all lines.
          The `transform -translate-y-1/2` might be pushing it too high on smaller screens.
        */}
        <div className="absolute top-[25%] left-[5%] sm:top-[28%] sm:left-[8%] md:top-[30%] md:left-[10%] lg:top-[32%] lg:left-[12%] xl:top-[35%] xl:left-[14%] 2xl:top-[38%] 2xl:left-[16%]">
          <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-[#007e63] leading-none tracking-tight drop-shadow-sm">
              SUMMER
              <br />
              REFRESH
            </h1>
            {/* The line break here is crucial for the two-line layout */}
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-medium leading-relaxed text-neutral-800">
              Discover neutrals & stylish sets
              <br />
              that make getting dressed easy.
            </p>
            {/* Re-introducing the button, with responsive sizing */}
            <Button
              variant="outline"
              className="rounded-full border-[1.5px] border-gray-500 text-xs sm:text-sm md:text-base font-semibold px-4 py-1 sm:px-5 sm:py-2 md:px-6 md:py-2.5 underline hover:bg-gray-100 transition-colors duration-200 mt-2 sm:mt-3 md:mt-4"
            >
              Women’s New Styles
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
