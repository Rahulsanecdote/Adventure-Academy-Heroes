import React from 'react';
import clsx from 'clsx';

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  glow?: boolean;
}

export const GameButton: React.FC<GameButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  glow = false,
  ...props
}) => {
  const baseStyles = 'font-display font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1 uppercase tracking-wide';
  
  const variantStyles = {
    primary: 'bg-roblox-blue hover:bg-roblox-darkblue text-white shadow-game hover:shadow-game-hover active:shadow-game-active',
    success: 'bg-roblox-green hover:bg-green-600 text-white shadow-game hover:shadow-game-hover active:shadow-game-active',
    warning: 'bg-roblox-yellow hover:bg-yellow-500 text-gray-900 shadow-game hover:shadow-game-hover active:shadow-game-active',
    danger: 'bg-roblox-red hover:bg-red-600 text-white shadow-game hover:shadow-game-hover active:shadow-game-active',
    purple: 'bg-roblox-purple hover:bg-purple-600 text-white shadow-game hover:shadow-game-hover active:shadow-game-active',
  };
  
  const sizeStyles = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6 text-base',
    lg: 'py-4 px-8 text-lg',
    xl: 'py-5 px-10 text-xl',
  };
  
  const glowClass = glow ? 'animate-glow' : '';
  
  return (
    <button
      className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], glowClass, className)}
      {...props}
    >
      {children}
    </button>
  );
};