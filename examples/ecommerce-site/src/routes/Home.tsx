import { TopBar } from '../layout/TopBar.js';
import { HeroSection } from '../layout/HeroSection.js';
import { SummerFindsCarousel } from '../layout/SummerFindsCarousel.js';
import { PromoBanner } from '../layout/PromoBanner.js';
import { MainNavbar } from '../layout/MainNavbar.js';

export function Home() {
  return (
    <div>
      <TopBar />
      <MainNavbar />
      <HeroSection />
      <SummerFindsCarousel />
      <PromoBanner />
    </div>
  );
}
