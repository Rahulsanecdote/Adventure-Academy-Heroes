import React from 'react';
import clsx from 'clsx';

interface StatDisplayProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export const StatDisplay: React.FC<StatDisplayProps> = ({
  icon,
  label,
  value,
  color = 'blue',
  size = 'md',
  animate = false
}) => {
  const colorStyles = {
    blue: 'bg-blue-50 border-blue-300 text-blue-600',
    green: 'bg-green-50 border-green-300 text-green-600',
    yellow: 'bg-yellow-50 border-yellow-300 text-yellow-600',
    purple: 'bg-purple-50 border-purple-300 text-purple-600',
    red: 'bg-red-50 border-red-300 text-red-600',
  };
  
  const sizeStyles = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
  
  const textSizes = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };
  
  return (
    <div className={clsx(
      'rounded-xl border-4 shadow-lg',
      colorStyles[color],
      sizeStyles[size],
      animate && 'hover:scale-105 transition-transform'
    )}>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-2xl">{icon}</div>
        <div className="text-sm font-semibold uppercase tracking-wide opacity-80">
          {label}
        </div>
      </div>
      <div className={clsx('font-display font-bold', textSizes[size])}>
        {value}
      </div>
    </div>
  );
};