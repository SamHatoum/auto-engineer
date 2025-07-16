import { TopBar } from '../layout/TopBar.tsx';
import { HeroSection } from '../layout/HeroSection.tsx';
import { SummerFindsCarousel } from '../layout/SummerFindsCarousel.tsx';
import { PromoBanner } from '../layout/PromoBanner.tsx';
import { MainNavbar } from '../layout/MainNavbar';

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
