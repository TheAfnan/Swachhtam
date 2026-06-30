import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 48 }: LogoProps) {
  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 aspect-square select-none pointer-events-none ${className}`} 
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Circular Green Ring/Arc (top-left framing) */}
        <path
          d="M 28 72 C 14 55 16 28 38 18 C 60 8 84 20 86 46"
          stroke="#439a26"
          strokeWidth="6.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Skyline / Three Green Buildings (vibrant green, slanted roofs) */}
        {/* Left Building (Short) */}
        <path 
          d="M 37 72 L 37 54 L 44 50 L 44 72 Z" 
          fill="#3b8216" 
        />
        {/* Middle Building (Tallest) */}
        <path 
          d="M 46 72 L 46 36 L 54 30 L 54 72 Z" 
          fill="#4ca631" 
        />
        {/* Right Building (Medium) */}
        <path 
          d="M 56 72 L 56 49 L 63 45 L 63 72 Z" 
          fill="#3b8216" 
        />

        {/* Yellow Sun on the right */}
        <circle 
          cx="69" 
          cy="38" 
          r="6" 
          fill="#f59e0b" 
        />

        {/* Left Leaf at bottom left */}
        <path
          d="M 18 52 C 10 64 16 84 34 88 C 32 76 28 62 18 52 Z"
          fill="#4fa833"
        />
        {/* White stem / vein on the Leaf */}
        <path
          d="M 18 52 C 24 66 30 78 34 88"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />

        {/* Cradling Hand (dynamic theme color via CSS variable) */}
        <path
          d="M 41 88 C 50 93 64 93 75 87 C 86 81 90 71 91 58 C 89 57 87 59 85 62 C 78 72 66 76 50 76 C 45 76 42 81 41 88 Z"
          fill="var(--logo-hand)"
        />
      </svg>
    </div>
  );
}

interface BrandWordmarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export function BrandWordmark({ className = '', size = 'md', showTagline = true }: BrandWordmarkProps) {
  // Map size to responsive classes and styling values
  const sizeClasses = {
    sm: {
      container: 'flex flex-col items-start justify-center',
      wordmark: 'text-sm sm:text-base font-extrabold tracking-tight leading-none flex items-center',
      tagline: 'text-[8px] font-semibold tracking-wide flex items-center gap-1 mt-0.5 leading-none',
      lineWidth: 'w-2 sm:w-3 h-[1px]',
    },
    md: {
      container: 'flex flex-col items-start justify-center',
      wordmark: 'text-base sm:text-lg font-extrabold tracking-tight leading-none flex items-center',
      tagline: 'text-[9px] font-semibold tracking-wide flex items-center gap-1.5 mt-0.5 leading-none',
      lineWidth: 'w-3 sm:w-4 h-[1px]',
    },
    lg: {
      container: 'flex flex-col items-center justify-center text-center',
      wordmark: 'text-xl sm:text-2xl font-extrabold tracking-tight leading-none flex items-center justify-center',
      tagline: 'text-[10px] sm:text-[11px] font-bold tracking-wide flex items-center justify-center gap-2 mt-1 leading-none',
      lineWidth: 'w-5 sm:w-6 h-[1.5px]',
    },
    xl: {
      container: 'flex flex-col items-center justify-center text-center',
      wordmark: 'text-3xl sm:text-4xl font-black tracking-tight leading-none flex items-center justify-center',
      tagline: 'text-[11px] sm:text-xs font-extrabold tracking-wider flex items-center justify-center gap-2.5 mt-1.5 leading-none',
      lineWidth: 'w-6 sm:w-8 h-[2px]',
    }
  }[size];

  return (
    <div className={`flex flex-col select-none ${sizeClasses.container} ${className}`}>
      {/* Wordmark with color parts */}
      <div className={sizeClasses.wordmark}>
        <span style={{ color: 'var(--wordmark-swachh)' }}>Swachh</span>
        <span style={{ color: 'var(--wordmark-tam)' }}>tam</span>
      </div>
      
      {/* Tagline "Ek Kadam, Behtar Shehar" flanked by lines */}
      {showTagline && (
        <div className={sizeClasses.tagline} style={{ color: 'var(--wordmark-tagline)' }}>
          <span 
            className={`${sizeClasses.lineWidth} shrink-0 opacity-80`} 
            style={{ backgroundColor: 'var(--wordmark-line)' }}
          />
          <span className="font-sans whitespace-nowrap">Ek Kadam, Behtar Shehar</span>
          <span 
            className={`${sizeClasses.lineWidth} shrink-0 opacity-80`} 
            style={{ backgroundColor: 'var(--wordmark-line)' }}
          />
        </div>
      )}
    </div>
  );
}

