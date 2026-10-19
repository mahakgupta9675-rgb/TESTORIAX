import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  darker?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = true,
  darker = false,
  ...props
}) => {
  return (
    <div
      className={`
        ${darker ? 'glass-panel-dark' : 'glass-panel'}
        rounded-3xl
        p-6
        shadow-glass
        transition-all
        duration-300
        ${hoverEffect ? 'hover:shadow-glass-hover hover:-translate-y-1 hover:border-lilac-300/80 hover:bg-white/60' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
