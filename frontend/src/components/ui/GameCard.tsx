import React from 'react';
import clsx from 'clsx';

interface GameCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  variant?: 'default' | 'premium' | 'locked';
}

export const GameCard: React.FC<GameCardProps> = ({ 
  children, 
  className, 
  hover = true,
  glow = false,
  variant = 'default'
}) => {
  const baseStyles = 'bg-white rounded-2xl border-4 p-6 transition-all duration-200';
  
  const variantStyles = {
    default: 'border-gray-200 shadow-lg',
    premium: 'border-roblox-yellow bg-gradient-to-br from-yellow-50 to-orange-50 shadow-glow-yellow',
    locked: 'border-gray-300 bg-gray-100 opacity-75',
  };
  
  const hoverStyles = hover && variant !== 'locked' 
    ? 'hover:scale-105 hover:shadow-2xl cursor-pointer hover:-translate-y-1' 
    : '';
    
  const glowClass = glow ? 'shadow-glow' : '';
  
  return (
    <div
      className={clsx(
        baseStyles,
        variantStyles[variant],
        hoverStyles,
        glowClass,
        className
      )}
    >
      {children}
    </div>
  );
};