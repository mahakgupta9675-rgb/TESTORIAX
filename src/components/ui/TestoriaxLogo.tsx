import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  showText?: boolean;
  textColor?: string;
  lightMode?: boolean;
}

export const TestoriaxLogo: React.FC<LogoProps> = ({
  showText = false,
  textColor = 'text-[#401567]',
  lightMode = true,
  className = '',
  ...props
}) => {
  const brandPurple = '#401567';
  const brandOrange = '#f37021';
  const displayTextColor = lightMode ? textColor : 'text-white';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10 select-none shrink-0"
        {...props}
      >
        {/* Left Pill (Purple in light mode, White in dark mode) */}
        <rect
          x="25"
          y="40"
          width="10"
          height="35"
          rx="5"
          fill={lightMode ? brandPurple : '#fff'}
        />

        {/* Middle Stem & Crossbar of T (Purple in light mode, White in dark mode) */}
        {/* Vertical Stem */}
        <rect
          x="45"
          y="32"
          width="10"
          height="43"
          fill={lightMode ? brandPurple : '#fff'}
        />
        {/* Horizontal Crossbar */}
        <rect
          x="36"
          y="24"
          width="28"
          height="10"
          rx="5"
          fill={lightMode ? brandPurple : '#fff'}
        />

        {/* Right Pill (Orange) */}
        <rect
          x="65"
          y="46"
          width="10"
          height="29"
          rx="5"
          fill={brandOrange}
        />

        {/* Top Floating Circle (Orange) */}
        <circle
          cx="50"
          cy="11"
          r="5.5"
          fill={brandOrange}
        />
      </svg>

      {showText && (
        <span
          className={`font-display font-black text-2xl tracking-tight transition-colors duration-300 ${displayTextColor}`}
          style={{ fontFamily: '"Outfit", sans-serif' }}
        >
          Testoriax
        </span>
      )}
    </div>
  );
};

export default TestoriaxLogo;
