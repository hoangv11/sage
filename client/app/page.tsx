import { HeroSection } from "@/components/homepage/hero-section";
import { Features } from "@/components/homepage/features";
import FAQs from "@/components/homepage/faqs-component";
import SideBySide from "@/components/homepage/side-by-side";
import PageWrapper from "@/components/wrapper/page-wrapper";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <PageWrapper>
      <HeroSection />
      <Features />
      <SideBySide />

      <FAQs />
      <Footer />
    </PageWrapper>
  );
}
