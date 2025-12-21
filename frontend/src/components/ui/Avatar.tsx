import React from 'react';
import clsx from 'clsx';

interface AvatarProps {
  username: string;
  level?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLevel?: boolean;
  online?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  username,
  level,
  size = 'md',
  showLevel = false,
  online = false,
  className
}) => {
  const sizeStyles = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
    xl: 'w-32 h-32 text-5xl',
  };
  
  const levelSizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg',
  };
  
  // Get random emoji based on username
  const emojis = ['🦁', '🐯', '🐻', '🦊', '🐼', '🐨', '🐸', '🦄', '🦖', '🦕', '🐲', '🦅'];
  const emojiIndex = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % emojis.length;
  
  return (
    <div className={clsx('relative inline-block', className)}>
      <div className={clsx(
        'rounded-full border-4 border-roblox-blue bg-gradient-to-br from-blue-100 to-purple-100',
        'flex items-center justify-center font-bold shadow-lg',
        sizeStyles[size]
      )}>
        {emojis[emojiIndex]}
      </div>
      
      {online && (
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-roblox-green border-2 border-white rounded-full"></div>
      )}
      
      {showLevel && level && (
        <div className={clsx(
          'absolute -bottom-2 -right-2 rounded-full bg-roblox-purple border-2 border-white',
          'flex items-center justify-center font-bold text-white shadow-lg',
          levelSizes[size]
        )}>
          {level}
        </div>
      )}
    </div>
  );
};