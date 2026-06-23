import type { Metadata } from "next";
import SonicWaveExperience from "./components/SonicWaveExperience";

export const metadata: Metadata = {
  title: "SonicWave Pro | Sound, Disassembled",
  description: "Experience the high-performance SonicWave Pro wireless headphones through interactive scrollytelling. Engineered with Neural-ANC, bio-cellulose drivers, and aerospace-grade chassis.",
  openGraph: {
    title: "SonicWave Pro | Premium Wireless Headphones",
    description: "Explore the internal architecture of the SonicWave Pro in 3D scrollytelling.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SonicWave Pro | Premium Wireless Headphones",
    description: "Explore the internal architecture of the SonicWave Pro in 3D scrollytelling.",
  }
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020202]">
      <SonicWaveExperience />
    </main>
  );
}
