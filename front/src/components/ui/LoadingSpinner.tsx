import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
  centered?: boolean;
  overlay?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Carregando...',
  className = '',
  centered = true,
  overlay = false
}) => {
  const containerClasses = overlay
    ? 'absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10'
    : centered
      ? `flex flex-col items-center justify-center p-4 ${className}`
      : className;

  return (
    <div className={containerClasses}>
      <div
        className={`animate-spin rounded-full border-b-2 border-orange-500 ${sizeClasses[size]} mx-auto mb-2`}
        role="status"
        aria-label={message}
      />
      {message && (
        <p className="text-gray-600 text-sm text-center" id="loading-message">
          {message}
        </p>
      )}
      <span className="sr-only">
        {message}
      </span>
    </div>
  );
};