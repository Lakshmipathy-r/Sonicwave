# 🎧 SonicWave Pro — Sound, Disassembled

SonicWave Pro is an interactive, immersive, Awwwards-level scrollytelling experience showcasing the design, acoustics, and engineering of premium wireless headphones.

Through high-performance image sequence canvas rendering and interactive browser-synthesized audio, users can "disassemble" and explore the headphones in real-time as they scroll.

---

## 🚀 Key Features

*   **High-Performance Canvas Rendering**: Preloads and renders a sequence of `192` high-fidelity image frames (`/public/frames/`) onto a single HTML5 `<canvas>` element using contain-scaling (supporting responsive letterboxing/pillarboxing) and Retina high-DPI resolution multipliers.
*   **Interactive Synthesized Audio Drone**: Features programmatically generated ambient sound utilizing the browser's native **Web Audio API** (`AudioContext`). A warm, lush C-minor 9th chord drone (C2, G2, C3, Eb3, G3) dynamically sweeps its low-pass filter cutoff frequency (from `250Hz` up to `2200Hz`) based on scroll depth, sonically simulating the physical disassembly of active noise cancellation (Neural-ANC).
*   **Fluid Scroll-Bound Animations**: Leveraging **Framer Motion**, content callout panels (ANC, Acoustic Cavity, Aerospace Materials, Specs) slide and fade gracefully in harmony with the scroll position.
*   **Circular SVG Brand Preloader**: Keeps users engaged while the 192 image frames preload in the background, featuring a glowing SVG circular progress bar and an entering fade transition.
*   **Dot-Matrix Anchor Navigation**: A sticky vertical dot-matrix menu allows users to jump directly to specific chapters of the headphone breakdown (0%, 25%, 52%, 78%, and 95% scroll depth) with smooth scrolling.
*   **Premium Visual Polish**: Designed in a dark, minimalist theme using curated modern typography and custom scrollbars styled with **Tailwind CSS v4**.

---

## 🛠️ Architecture & Tech Stack

The application is built on:
*   **Framework**: [Next.js 16 (App Router)](file:///D:/Projects/Website%20animations/headphones-anim/package.json)
*   **UI Library**: [React 19](file:///D:/Projects/Website%20animations/headphones-anim/package.json)
*   **Animation System**: [Framer Motion 12](file:///D:/Projects/Website%20animations/headphones-anim/package.json)
*   **Styling Engine**: [Tailwind CSS v4](file:///D:/Projects/Website%20animations/headphones-anim/package.json) (compiled with `@tailwindcss/postcss`)
*   **Graphics**: Native HTML5 Canvas 2D API for 60FPS fluid frame scrubbing
*   **Acoustics**: Native Web Audio API for synthesizer and dynamic Lowpass Filter mapping

---

## 📂 Project Directory Structure

Below is an overview of the core project structure:

```
headphones-anim/
├── app/
│   ├── components/
│   │   └── SonicWaveExperience.tsx   # Core scrollytelling canvas + audio synthesizer component
│   ├── globals.css                   # Tailwind v4 import & custom scrollbar styles
│   ├── layout.tsx                    # Next.js root layout
│   └── page.tsx                      # Page wrapper and metadata declarations
├── public/
│   └── frames/                       # 192 sequential animation frames (frame_000 to frame_191)
├── package.json                      # Next.js, React, and dependency versions
├── next.config.ts                    # Next.js compiler configuration
└── tsconfig.json                     # TypeScript compiler configuration
```

### Critical File Links

*   **Experience Logic**: [`SonicWaveExperience.tsx`](file:///D:/Projects/Website%20animations/headphones-anim/app/components/SonicWaveExperience.tsx) controls the image preloader, canvas scaling, scroll tracking via Framer Motion's `useScroll`, and Web Audio oscillator nodes.
*   **Home Entry**: [`page.tsx`](file:///D:/Projects/Website%20animations/headphones-anim/app/page.tsx) renders the main layout and injects SEO/OpenGraph meta-data tags.
*   **Styling Entry**: [`globals.css`](file:///D:/Projects/Website%20animations/headphones-anim/app/globals.css) imports Tailwind and defines the global color system tokens.

---

## ⚙️ Installation & Development

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) (v18.x or later recommended) installed on your machine.

### 2. Install Dependencies
Clone the repository, navigate into the project directory, and install required node modules:
```bash
npm install
```

### 3. Run Development Server
Start the local Next.js dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to inspect the application.

### 4. Build for Production
Generate an optimized static build of the application:
```bash
npm run build
```
You can preview the built site locally using:
```bash
npm run start
```

---

## 🎹 Interactive Audio Specifications
The ambient synthesized sound engine uses five sub-sine/triangle oscillator nodes tuned to harmonic chord intervals of C-minor:
*   **C2** (`65.41 Hz`) - Sub-bass foundational tone (Sine oscillator)
*   **G2** (`98.00 Hz`) - Perfect fifth support (Triangle oscillator)
*   **C3** (`130.81 Hz`) - Middle octave root (Sine oscillator)
*   **E♭3** (`155.56 Hz`) - Minor third modal tone (Triangle oscillator)
*   **G3** (`196.00 Hz`) - Fifth extension (Sine oscillator)

A `BiquadFilterNode` is wired between the oscillators and the master output. Detuning is randomized between `[-6, +6]` cents per voice to widen the spatial field. Scroll scrubbing controls the filter cutoff `frequency` linearly to reflect visual isolation.
