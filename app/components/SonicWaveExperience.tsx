"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

export default function SonicWaveExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  // Loading state
  const [loadProgress, setLoadProgress] = useState(0);
  const [allLoaded, setAllLoaded] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  // Audio state
  const [isMuted, setIsMuted] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscsRef = useRef<{ osc: OscillatorNode; oscGain: GainNode }[]>([]);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Screen resize tracking for canvas redrawing
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const totalFrames = 192;

  // Scroll Tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Smooth scroll progression using spring
  const smoothProgress = useSpring(scrollYProgress, {
    damping: 35,
    stiffness: 120,
    mass: 0.6,
  });

  // Track active section for indicator
  const [activeSection, setActiveSection] = useState(0);

  // Preload images
  useEffect(() => {
    let loaded = 0;
    const tempImages: HTMLImageElement[] = [];

    const handleLoad = () => {
      loaded++;
      setLoadProgress(Math.floor((loaded / totalFrames) * 100));
      if (loaded === totalFrames) {
        setAllLoaded(true);
      }
    };

    const handleError = (e: any) => {
      console.error("Failed to load frame: ", e.target?.src);
      // Increment anyway to prevent getting stuck
      loaded++;
      setLoadProgress(Math.floor((loaded / totalFrames) * 100));
      if (loaded === totalFrames) {
        setAllLoaded(true);
      }
    };

    for (let i = 0; i < totalFrames; i++) {
      const img = new Image();
      const paddedIndex = i.toString().padStart(3, "0");
      img.src = `/frames/frame_${paddedIndex}_delay-0.041s.png`;
      img.onload = handleLoad;
      img.onerror = handleError;
      tempImages.push(img);
    }
    imagesRef.current = tempImages;
  }, []);

  // Handle Canvas Resize and DPI adjustment
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      setCanvasSize({ width, height });
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [allLoaded]);

  // Canvas drawing routine
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesRef.current[index]) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imagesRef.current[index];
    const width = canvasSize.width || window.innerWidth;
    const height = canvasSize.height || window.innerHeight;

    ctx.clearRect(0, 0, width, height);

    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    if (imgWidth === 0 || imgHeight === 0) return;

    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = width / height;

    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    // "Contain" scaling implementation
    if (canvasRatio > imgRatio) {
      // Canvas is wider than image (bars on left/right)
      drawHeight = height;
      drawWidth = height * imgRatio;
      offsetX = (width - drawWidth) / 2;
    } else {
      // Canvas is taller than image (bars on top/bottom)
      drawWidth = width;
      drawHeight = width / imgRatio;
      offsetY = (height - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // Draw current frame when scroll progress changes
  useEffect(() => {
    const unsubscribe = smoothProgress.on("change", (latest) => {
      if (!allLoaded || imagesRef.current.length === 0) return;

      const frameIndex = Math.min(
        totalFrames - 1,
        Math.max(0, Math.floor(latest * totalFrames))
      );
      
      drawFrame(frameIndex);

      // Determine active text section for progress dot
      if (latest < 0.15) {
        setActiveSection(0);
      } else if (latest >= 0.15 && latest < 0.45) {
        setActiveSection(1);
      } else if (latest >= 0.45 && latest < 0.68) {
        setActiveSection(2);
      } else if (latest >= 0.68 && latest < 0.88) {
        setActiveSection(3);
      } else {
        setActiveSection(4);
      }

      // Update synthesizer cutoff frequency based on scroll
      if (filterRef.current && audioCtxRef.current && !isMuted) {
        const ctx = audioCtxRef.current;
        // Map 0-1 scroll to 250Hz - 2400Hz frequency
        const minF = 250;
        const maxF = 2200;
        // As it disassembles (scrolls down), open the filter (make it sound bright and open)
        const targetF = minF + (maxF - minF) * latest;
        filterRef.current.frequency.setTargetAtTime(targetF, ctx.currentTime, 0.08);
      }
    });

    return () => unsubscribe();
  }, [smoothProgress, allLoaded, canvasSize, isMuted]);

  // Initial draw when assets load
  useEffect(() => {
    if (allLoaded && imagesRef.current.length > 0) {
      drawFrame(0);
    }
  }, [allLoaded, canvasSize]);

  // Audio Synth Initialization
  const initAudio = () => {
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // Create Low Pass Filter to simulate ANC frequency cut
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    // Sync initial frequency with current scroll position
    const currentScroll = smoothProgress.get();
    const initialFreq = 250 + (2200 - 250) * currentScroll;
    filter.frequency.setValueAtTime(initialFreq, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime); // Slight resonance
    filterRef.current = filter;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGainRef.current = masterGain;

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Warm, lush C minor 9 chord drone: C2, G2, C3, Eb3, G3
    const frequencies = [65.41, 98.00, 130.81, 155.56, 196.00];
    
    const oscs = frequencies.map((freq, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      // Mix saw/triangle/sine for rich acoustic modeling
      if (i === 0) {
        osc.type = "sine"; // Sub bass
      } else if (i % 2 === 0) {
        osc.type = "triangle";
      } else {
        osc.type = "sine";
      }

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      // Slight detune for spatial width
      osc.detune.setValueAtTime((Math.random() - 0.5) * 12, ctx.currentTime);

      // Distribute gain levels
      const gainVal = i === 0 ? 0.3 : 0.12 - (i * 0.01);
      oscGain.gain.setValueAtTime(gainVal, ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();

      return { osc, oscGain };
    });

    oscsRef.current = oscs;

    // Smooth audio fade in
    masterGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1.5);
  };

  const handleToggleSound = () => {
    if (!audioCtxRef.current) {
      initAudio();
      setIsMuted(false);
      return;
    }

    const ctx = audioCtxRef.current;
    if (isMuted) {
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      masterGainRef.current?.gain.setTargetAtTime(0.25, ctx.currentTime, 0.2);
      setIsMuted(false);
    } else {
      masterGainRef.current?.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setIsMuted(true);
    }
  };

  // Enter Experience handler
  const handleEnterExperience = () => {
    setHasEntered(true);
    // Automatically trigger audio on enter if user enters
    initAudio();
    setIsMuted(false);
  };

  // Transform mapping for scroll animations
  const heroOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.08], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.08], [0, -50]);

  // Section 1 Callout (ANC)
  const sec1Opacity = useTransform(scrollYProgress, [0.15, 0.22, 0.35, 0.42], [0, 1, 1, 0]);
  const sec1X = useTransform(scrollYProgress, [0.15, 0.22, 0.35, 0.42], [-40, 0, 0, -40]);

  // Section 2 Callout (Acoustic Chamber)
  const sec2Opacity = useTransform(scrollYProgress, [0.45, 0.52, 0.60, 0.66], [0, 1, 1, 0]);
  const sec2X = useTransform(scrollYProgress, [0.45, 0.52, 0.60, 0.66], [40, 0, 0, 40]);

  // Section 3 Callout (Material Design)
  const sec3Opacity = useTransform(scrollYProgress, [0.68, 0.74, 0.82, 0.88], [0, 1, 1, 0]);
  const sec3Y = useTransform(scrollYProgress, [0.68, 0.74, 0.82, 0.88], [40, 0, 0, -40]);

  // Section 4 CTA Fade
  const sec4Opacity = useTransform(scrollYProgress, [0.89, 0.94], [0, 1]);
  const sec4Y = useTransform(scrollYProgress, [0.89, 0.94], [60, 0]);

  return (
    <div className="relative min-h-screen w-full select-none overflow-x-hidden font-sans">
      
      {/* 1. Brand Preloader */}
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020202] text-white"
        initial={{ opacity: 1 }}
        animate={{ 
          opacity: hasEntered ? 0 : 1,
          pointerEvents: hasEntered ? "none" : "auto" 
        }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      >
        <div className="flex flex-col items-center max-w-md px-6 text-center">
          <motion.h2 
            className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Acoustic Disassembly System
          </motion.h2>

          <motion.h1 
            className="text-4xl md:text-5xl font-extralight tracking-[0.25em] text-white mb-12 uppercase select-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1.2 }}
          >
            SonicWave Pro
          </motion.h1>

          {/* Glowing Circular Progress */}
          <div className="relative w-32 h-32 flex items-center justify-center mb-12">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                className="stroke-white/10"
                strokeWidth="1.5"
                fill="transparent"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="56"
                className="stroke-white"
                strokeWidth="2"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={2 * Math.PI * 56 * (1 - loadProgress / 100)}
                transition={{ ease: "easeOut", duration: 0.3 }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-light tracking-tight">{loadProgress}%</span>
              <span className="text-[8px] uppercase tracking-widest text-white/30 mt-0.5">
                {allLoaded ? "Ready" : "Loading"}
              </span>
            </div>
          </div>

          {/* Enter Button */}
          <div className="h-14">
            {allLoaded && (
              <motion.button
                onClick={handleEnterExperience}
                className="group relative px-8 py-3 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-xs uppercase tracking-widest text-white hover:text-black transition-colors duration-500 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="absolute inset-0 w-full h-full bg-white scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-[0.76,0,0.24,1] z-0" />
                <span className="relative z-10 transition-colors duration-500">
                  Enter Experience
                </span>
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* 2. Audio Control & Brand Nav Overlay */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-12 py-6 mix-blend-difference">
        <a href="#" className="flex items-center gap-2">
          <span className="text-sm font-light tracking-[0.3em] uppercase text-white hover:opacity-80 transition-opacity">
            SonicWave
          </span>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.25em] uppercase text-white/50">
          <span className={`transition-colors duration-300 ${activeSection === 1 ? 'text-white' : ''}`}>ANC</span>
          <span className={`transition-colors duration-300 ${activeSection === 2 ? 'text-white' : ''}`}>Drivers</span>
          <span className={`transition-colors duration-300 ${activeSection === 3 ? 'text-white' : ''}`}>Materials</span>
          <span className={`transition-colors duration-300 ${activeSection === 4 ? 'text-white' : ''}`}>Reserve</span>
        </div>

        <button 
          onClick={handleToggleSound}
          className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[9px] uppercase tracking-[0.15em] text-white/80 hover:bg-white hover:text-black hover:border-white transition-all duration-300 pointer-events-auto"
        >
          <div className="flex gap-[2px] items-center h-2.5 w-4 justify-center">
            {isMuted ? (
              <span className="w-4 h-[1px] bg-current block transform rotate-12"></span>
            ) : (
              [...Array(4)].map((_, i) => (
                <motion.span
                  key={i}
                  className="w-[1.5px] bg-current rounded-full"
                  animate={{
                    height: [4, 10, 4],
                  }}
                  transition={{
                    duration: 0.6 + i * 0.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))
            )}
          </div>
          <span>{isMuted ? "Sound Off" : "Ambient On"}</span>
        </button>
      </header>

      {/* 3. Sticky Canvas Backdrop */}
      <div className="fixed inset-0 z-0 h-screen w-screen bg-gradient-to-b from-[#020202] via-[#0b0c0e] to-[#15161a]">
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain opacity-100"
        />
      </div>

      {/* 4. Vertical Scroll Indicator Dot Matrix */}
      <div className="fixed right-6 md:right-12 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-5 items-center">
        {[0, 1, 2, 3, 4].map((index) => (
          <button
            key={index}
            onClick={() => {
              const scrollTargets = [0, 0.25, 0.52, 0.78, 0.95];
              window.scrollTo({
                top: scrollTargets[index] * (containerRef.current?.scrollHeight || 0),
                behavior: "smooth"
              });
            }}
            className="group relative flex items-center justify-center w-5 h-5 focus:outline-none"
          >
            <div 
              className={`w-1 h-1 rounded-full bg-white transition-all duration-500 ${
                activeSection === index ? "scale-[2] shadow-[0_0_10px_#fff]" : "opacity-30 group-hover:opacity-60"
              }`} 
            />
            {activeSection === index && (
              <motion.div 
                layoutId="activeIndicator"
                className="absolute w-4 h-4 rounded-full border border-white/20"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 5. Scrollable Container */}
      <div ref={containerRef} className="relative z-10 w-full bg-transparent" style={{ height: "650vh" }}>
        
        {/* Section 0: HERO (0vh - 100vh) */}
        <section className="relative h-screen w-full flex items-center justify-center">
          <motion.div 
            style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
            className="flex flex-col items-center text-center px-4 max-w-4xl"
          >
            <h1 className="text-5xl md:text-8xl font-thin tracking-[-0.04em] text-white leading-tight uppercase">
              SonicWave Pro
            </h1>
            <p className="mt-6 text-sm md:text-base font-light tracking-[0.2em] text-white/50 max-w-lg uppercase">
              Sound, disassociated. Scroll to explode.
            </p>
            
            {/* Scroll Indicator Icon */}
            <motion.div 
              className="absolute bottom-12 flex flex-col items-center gap-2"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-[9px] tracking-[0.3em] uppercase text-white/30">Scroll to Explore</span>
              <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        {/* Section 1: ANC (100vh - 250vh) */}
        <section className="relative h-screen w-full flex items-center px-8 md:px-24 pointer-events-none">
          <motion.div
            style={{ opacity: sec1Opacity, x: sec1X }}
            className="max-w-md text-left flex flex-col gap-4 pointer-events-auto"
          >
            <div className="inline-flex items-center self-start px-2.5 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[8px] tracking-[0.2em] uppercase text-white/60">
              Isolation Core
            </div>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white uppercase">
              Silence <br />
              <span className="font-extralight text-white/60">Redefined.</span>
            </h2>
            <p className="text-sm text-white/50 leading-relaxed font-light">
              Equipped with our advanced Neural-ANC chip, the SonicWave Pro cancels up to 42dB of environmental sound. Six high-fidelity beamforming microphones continuously audit noise in real-time, isolating your acoustic space.
            </p>
          </motion.div>
        </section>

        {/* Section 2: Acoustic Chamber (250vh - 400vh) */}
        <section className="relative h-screen w-full flex items-center justify-end px-8 md:px-24 pointer-events-none">
          <motion.div
            style={{ opacity: sec2Opacity, x: sec2X }}
            className="max-w-md text-left flex flex-col gap-4 pointer-events-auto"
          >
            <div className="inline-flex items-center self-start px-2.5 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[8px] tracking-[0.2em] uppercase text-white/60">
              Acoustic Cavity
            </div>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white uppercase">
              Physical <br />
              <span className="font-extralight text-white/60">Acoustics.</span>
            </h2>
            <p className="text-sm text-white/50 leading-relaxed font-light">
              Step inside the explosion. The acoustic cavity features a dual-chamber ventilation system that reduces compression spikes. Our 40mm bio-cellulose drivers deliver thunderous sub-bass and crystalline high-frequency extension without distortion.
            </p>
          </motion.div>
        </section>

        {/* Section 3: Premium Build / Exploded Parts (400vh - 550vh) */}
        <section className="relative h-screen w-full flex items-center px-8 md:px-24 pointer-events-none">
          <motion.div
            style={{ opacity: sec3Opacity, y: sec3Y }}
            className="max-w-md text-left flex flex-col gap-4 pointer-events-auto"
          >
            <div className="inline-flex items-center self-start px-2.5 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[8px] tracking-[0.2em] uppercase text-white/60">
              Chassis Materials
            </div>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white uppercase">
              Aerospace <br />
              <span className="font-extralight text-white/60">Precision.</span>
            </h2>
            <p className="text-sm text-white/50 leading-relaxed font-light">
              Crafted from high-tensile carbon fiber and bead-blasted aircraft-grade aluminum. Memory foam earcups wrapped in sound-permeable fabric alleviate pressure points, providing an weightless fit for continuous, immersive listening.
            </p>
          </motion.div>
        </section>

        {/* Section 4: CTA / Specs (550vh - 650vh) */}
        <section className="relative h-screen w-full flex items-center justify-center px-8">
          <motion.div
            style={{ opacity: sec4Opacity, y: sec4Y }}
            className="max-w-4xl w-full flex flex-col items-center text-center gap-12"
          >
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[8px] tracking-[0.2em] uppercase text-white/60 mb-6">
                Now Available
              </div>
              <h2 className="text-4xl md:text-7xl font-extralight tracking-tight text-white uppercase leading-none">
                Own the Sound.
              </h2>
              <p className="mt-4 text-xs md:text-sm tracking-[0.1em] text-white/40 uppercase font-light">
                Join the sonic revolution.
              </p>
            </div>

            {/* Spec Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl py-8 border-y border-white/10">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-light tracking-tight text-white">60 hrs</span>
                <span className="text-[8px] tracking-wider uppercase text-white/30 mt-1">Playback</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-light tracking-tight text-white">-42 dB</span>
                <span className="text-[8px] tracking-wider uppercase text-white/30 mt-1">Smart ANC</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-light tracking-tight text-white">Hi-Res</span>
                <span className="text-[8px] tracking-wider uppercase text-white/30 mt-1">Wireless Audio</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-light tracking-tight text-white">40 mm</span>
                <span className="text-[8px] tracking-wider uppercase text-white/30 mt-1">Drivers</span>
              </div>
            </div>

            {/* CTA Preorder Button */}
            <motion.button 
              className="px-10 py-4 bg-white text-black font-semibold text-xs uppercase tracking-widest rounded-full hover:bg-white/90 hover:scale-105 active:scale-98 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.15)] z-20 pointer-events-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Pre-order SonicWave
            </motion.button>
          </motion.div>
        </section>

      </div>

      {/* Footer minimal info */}
      <footer className="absolute bottom-6 left-0 right-0 z-30 flex justify-between px-8 md:px-12 text-[8px] tracking-[0.2em] uppercase text-white/20">
        <span>© 2026 SonicWave Inc.</span>
        <span>Awwwards-level Scrollytelling Experience</span>
      </footer>

    </div>
  );
}
