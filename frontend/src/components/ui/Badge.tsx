import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  icon: string;
  name: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  size?: 'sm' | 'md' | 'lg';
  locked?: boolean;
  onClick?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  icon,
  name,
  rarity = 'common',
  size = 'md',
  locked = false,
  onClick
}) => {
  const rarityColors = {
    common: 'from-gray-400 to-gray-500 border-gray-400',
    rare: 'from-blue-400 to-blue-600 border-blue-500',
    epic: 'from-purple-400 to-purple-600 border-purple-500',
    legendary: 'from-yellow-400 to-orange-500 border-yellow-500',
  };
  
  const sizeStyles = {
    sm: 'w-16 h-16 text-2xl',
    md: 'w-20 h-20 text-3xl',
    lg: 'w-28 h-28 text-5xl',
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  return (
    <div 
      className={clsx(
        'flex flex-col items-center gap-2',
        onClick && 'cursor-pointer hover:scale-110 transition-transform'
      )}
      onClick={onClick}
    >
      <div className={clsx(
        'rounded-full border-4 flex items-center justify-center',
        'bg-gradient-to-br shadow-lg',
        sizeStyles[size],
        locked ? 'bg-gray-300 border-gray-400 grayscale' : rarityColors[rarity],
        !locked && 'hover:shadow-xl'
      )}>
        {locked ? '🔒' : icon}
      </div>
      <div className={clsx(
        'font-semibold text-center',
        textSizes[size],
        locked ? 'text-gray-400' : 'text-gray-700'
      )}>
        {name}
      </div>
    </div>
  );
};