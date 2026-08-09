import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Metrics } from "@/components/Metrics";
import { FeatureGrid } from "@/components/FeatureGrid";
import { IncidentSimulator } from "@/components/IncidentSimulator";
import { ArchitectureShowcase } from "@/components/ArchitectureShowcase";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Metrics />
        <FeatureGrid />
        <IncidentSimulator />
        <ArchitectureShowcase />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
