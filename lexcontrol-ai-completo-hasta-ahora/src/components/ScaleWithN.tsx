import React from "react";

interface ScaleWithNProps {
  className?: string;
  size?: number;
}

export default function ScaleWithN({ className = "text-roseOld", size = 36 }: ScaleWithNProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size}
      height={size}
      className={className} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      id="custom-lexcontrol-logo-svg"
    >
      {/* SVG Definitions for Gradients and Glow Effects */}
      <defs>
        <linearGradient id="logoRoseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0A3A3" />
          <stop offset="50%" stopColor="#C38E8E" />
          <stop offset="100%" stopColor="#A86B6B" />
        </linearGradient>
        <linearGradient id="logoBaseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="50%" stopColor="currentColor" stopOpacity={0.8} />
          <stop offset="100%" stopColor="currentColor" />
        </linearGradient>
        <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#C38E8E" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* 1. ARCHITECTURAL PILLAR: Highly refined Narrow Monogram 'N' (White central support columns) */}
      {/* Left Column Stanchion representing the left stroke of the N */}
      <path 
        d="M 44 32 L 44 74" 
        stroke="#FFFFFF" 
        strokeWidth="1.8" 
        strokeLinecap="round"
      />
      {/* Right Column Stanchion representing the right stroke of the N */}
      <path 
        d="M 56 32 L 56 74" 
        stroke="#FFFFFF" 
        strokeWidth="1.8" 
        strokeLinecap="round"
      />
      {/* White Diagonal Monogram Stroke completing the elegant narrow 'N' */}
      <path 
        d="M 44 32 L 56 74" 
        stroke="#FFFFFF" 
        strokeWidth="1.8" 
        strokeLinecap="round"
        className="transition-all duration-300"
      />

      {/* 2. REFINED TWO-TIER PEDESTAL BASE */}
      {/* Upper Pedestal plate */}
      <path d="M 28 74 L 72 74" stroke="url(#logoBaseGradient)" strokeWidth="4.5" />
      {/* Lower Grounding Plate with extra broad stable design */}
      <path d="M 18 80 L 82 80" stroke="url(#logoBaseGradient)" strokeWidth="4.5" />

      {/* 3. CENTRAL BALANCE PIVOT ASSEMBLY */}
      {/* Top vertical connector from N stand up to Pivot */}
      <path d="M 50 32 L 50 24" stroke="currentColor" strokeWidth="3" />
      {/* Pivot core circular anchor */}
      <circle cx="50" cy="24" r="4.5" fill="currentColor" />
      <circle cx="50" cy="24" r="1.8" fill="#C38E8E" />

      {/* 4. BALANCED POINTER / NEEDLE */}
      <path d="M 50 19.5 L 50 7" stroke="currentColor" strokeWidth="2.5" />
      <polygon points="50,4 47.5,7.5 52.5,7.5" fill="currentColor" />

      {/* 5. GILDED BALANCE BEAM (CROSSBAR) */}
      {/* Fluid organic curve representing justice perfectly in suspension */}
      <path 
        d="M 10 27 Q 50 18 90 27" 
        stroke="currentColor" 
        strokeWidth="3.2" 
        strokeLinecap="round"
      />

      {/* 6. LEFT PRECISION SCALE PAN Assembly */}
      {/* Left hook hanger point */}
      <circle cx="10" cy="27" r="1.5" fill="currentColor" />
      {/* High-fidelity suspension lines */}
      <path d="M 10 27 L 2 52" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
      <path d="M 10 27 L 18 52" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
      {/* Left Hanging bowl plate with deep volumetric inner glow */}
      <path 
        d="M 2 52 C 2 61, 18 61, 18 52 Z" 
        fill="currentColor" 
        fillOpacity="0.14" 
        stroke="currentColor" 
        strokeWidth="2" 
      />
      {/* Symmetrical central calibration point for Left scale */}
      <line x1="10" y1="52" x2="10" y2="55.5" stroke="currentColor" strokeWidth="2" />

      {/* 7. RIGHT PRECISION SCALE PAN Assembly */}
      {/* Right hook hanger point */}
      <circle cx="90" cy="27" r="1.5" fill="currentColor" />
      {/* High-fidelity suspension lines */}
      <path d="M 90 27 L 82 52" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
      <path d="M 90 27 L 98 52" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
      {/* Right Hanging bowl plate with deep volumetric inner glow */}
      <path 
        d="M 82 52 C 82 61, 98 61, 98 52 Z" 
        fill="currentColor" 
        fillOpacity="0.14" 
        stroke="currentColor" 
        strokeWidth="2" 
      />
      {/* Symmetrical central calibration point for Right scale */}
      <line x1="90" y1="52" x2="90" y2="55.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

