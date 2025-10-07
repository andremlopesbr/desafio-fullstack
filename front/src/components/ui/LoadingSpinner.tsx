import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Carregando...',
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <div
        className={`animate-spin rounded-full border-b-2 border-orange-500 ${sizeClasses[size]} mx-auto mb-2`}
      />
      {message && <p className="text-gray-600 text-sm">{message}</p>}
    </div>
  );
};