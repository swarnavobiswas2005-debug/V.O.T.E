import React from 'react';

interface BrandLogoProps {
  variant?: 'primary' | 'monochrome' | 'dark' | 'light';
  size?: number;
  animated?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'primary',
  size = 48,
  animated = true,
}) => {
  // Get color configuration based on variant
  const getColors = () => {
    switch (variant) {
      case 'monochrome':
        return {
          shield: '#1F1F1F',
          checkmark: '#1F1F1F',
          chain: '#1F1F1F',
          glow: 'transparent',
        };
      case 'dark':
      case 'light':
      case 'primary':
      default:
        return {
          shield: 'var(--color-primary)',
          checkmark: 'var(--color-accent)',
          chain: 'var(--color-success)',
          glow: 'var(--color-primary-glow)',
        };
    }
  };

  const colors = getColors();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: animated ? `drop-shadow(0 0 10px ${colors.glow})` : 'none',
        transition: 'all 0.3s ease',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <defs>
        <linearGradient id="shieldGrad" x1="16" y1="8" x2="84" y2="92">
          <stop offset="0%" stopColor={colors.shield} />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="contentGrad" x1="30" y1="35" x2="70" y2="65">
          <stop offset="0%" stopColor={colors.checkmark} />
          <stop offset="100%" stopColor={colors.chain} />
        </linearGradient>
      </defs>

      {/* Protective Shield Path */}
      <path
        d="M50 8C74 8 84 13 84 43C84 68 70 84 50 92C30 84 16 68 16 43C16 13 26 8 50 8Z"
        stroke="url(#shieldGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(15, 23, 42, 0.65)"
        style={{
          animation: animated ? 'logo-shield-pulse 3s infinite ease-in-out' : 'none',
        }}
      />

      {/* Interlocking Link 1 (Checkmark base) */}
      <path
        d="M32 52L44 64L68 40"
        stroke="url(#contentGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: animated ? '100' : 'none',
          animation: animated ? 'logo-draw 2.5s ease-out forwards' : 'none',
        }}
      />

      {/* Interlocking Link 2 (Secondary overlaying chain) */}
      <path
        d="M48 58C44 54 44 48 48 44C52 40 58 40 62 44L68 50C72 54 72 60 68 64C64 68 58 68 54 64"
        stroke={colors.chain}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        style={{
          strokeDasharray: animated ? '60' : 'none',
          strokeDashoffset: animated ? '60' : 'none',
          animation: animated ? 'logo-draw-chain 2.5s ease-out forwards 0.5s' : 'none',
        }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes logo-shield-pulse {
          0%, 100% {
            stroke: ${colors.shield};
            filter: drop-shadow(0 0 2px ${colors.glow});
          }
          50% {
            stroke: ${colors.chain};
            filter: drop-shadow(0 0 10px ${colors.glow});
          }
        }
        @keyframes logo-draw {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes logo-draw-chain {
          0% {
            stroke-dashoffset: 60;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}} />
    </svg>
  );
};
