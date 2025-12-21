import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false }) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl shadow-lg p-6',
        hover && 'hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};