import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'brand';
  height?: string | number;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-auto h-8', variant = 'brand', height }) => {
  const getFillColor = () => {
    switch (variant) {
      case 'light': // White logo for dark headers
        return '#FFFFFF';
      case 'dark': // Slate charcoal logo
        return '#0F172A';
      case 'brand':
      default: // Original corporate navy blue logo
        return '#004B7C';
    }
  };

  const fill = getFillColor();

  return (
    <svg 
      viewBox="0 0 275 75" 
      className={className}
      style={height !== undefined ? { height } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bold, premium "AIMMS" typographic style matched to the logo */}
      <text 
        x="5" 
        y="58" 
        fontFamily='"Inter", "Space Grotesk", ui-sans-serif, system-ui, sans-serif'
        fontWeight="900" 
        fontSize="55" 
        letterSpacing="-0.03em"
        fill={fill}
      >
        AIMMS
      </text>
      {/* Trademark superscript designation */}
      <text 
        x="215" 
        y="30" 
        fontFamily='"Inter", "Space Grotesk", ui-sans-serif, system-ui, sans-serif'
        fontWeight="800" 
        fontSize="16"
        letterSpacing="-0.01em"
        fill={fill}
      >
        TM
      </text>
    </svg>
  );
};
