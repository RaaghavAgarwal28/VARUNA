import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { FeatureCards } from "./FeatureCards";
import { MuleNetworkSection } from "./MuleNetworkSection";
import { ShaderSection } from "./ShaderSection";
import { FraudInterceptionSection } from "./FraudInterceptionSection";
import { ActionBriefSection } from "./ActionBriefSection";
import { FinalCTA } from "./FinalCTA";

export function LandingPage() {
  useEffect(() => {
    // Lenis buttery smooth scroll
    const lenis = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
      infinite: false,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="relative w-full overflow-x-hidden">
      {/* Sticky nav that theme-switches between light and dark sections */}
      <Navbar />

      <main className="relative w-full">
        {/* ① LIGHT — Hero with WebGL rupee coins */}
        <HeroSection />

        {/* ② DARK — Feature cards (pure black) */}
        <FeatureCards />

        {/* ③ DARK — GPU Shader Animation: neural signal interstitial */}
        <ShaderSection />

        {/* ④ DARK — Mule Network / GAT WebGL visualization */}
        <MuleNetworkSection />

        {/* ④ LIGHT — Fraud Interception Security */}
        <FraudInterceptionSection />

        {/* ⑤ LIGHT — Action Brief + 3D cards */}
        <ActionBriefSection />

        {/* ⑥ DARK — Final CTA with WebGL rupee coins */}
        <FinalCTA />
      </main>
    </div>
  );
}
