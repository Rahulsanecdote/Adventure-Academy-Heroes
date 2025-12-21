import React from 'react';
import clsx from 'clsx';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'rainbow';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  color = 'blue',
  size = 'md',
  animated = true,
  className = ''
}) => {
  const heightStyles = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
  };
  
  const colorStyles = {
    blue: 'bg-roblox-blue',
    green: 'bg-roblox-green',
    yellow: 'bg-roblox-yellow',
    purple: 'bg-roblox-purple',
    rainbow: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
  };
  
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-gray-700">{label}</span>
          {showPercentage && (
            <span className="font-bold text-roblox-blue">{clampedProgress}%</span>
          )}
        </div>
      )}
      <div className={clsx(
        'w-full rounded-full bg-gray-200 border-2 border-gray-300 overflow-hidden',
        heightStyles[size]
      )}>
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorStyles[color],
            animated && 'animate-pulse'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};