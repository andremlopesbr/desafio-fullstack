import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingStateProps {
  /** Tamanho do spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Mensagem de loading */
  message?: string;
  /** Classes CSS adicionais */
  className?: string;
  /** Se deve centralizar o conteúdo */
  centered?: boolean;
  /** Se deve ser um overlay sobre outros elementos */
  overlay?: boolean;
  /** Tipo de estado de loading */
  type?: 'spinner' | 'skeleton' | 'pulse';
  /** Número de linhas do skeleton (quando type='skeleton') */
  skeletonLines?: number;
}

/**
 * Componente padronizado para estados de loading
 * Oferece diferentes tipos de indicadores visuais
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  message = 'Carregando...',
  className = '',
  centered = true,
  overlay = false,
  type = 'spinner',
  skeletonLines = 3
}) => {
  if (type === 'skeleton') {
    return (
      <div className={`${centered ? 'flex flex-col items-center justify-center p-4' : ''} ${className}`}>
        {Array.from({ length: skeletonLines }, (_, index) => (
          <div
            key={index}
            className={`animate-pulse bg-gray-200 rounded mb-2 ${
              index === skeletonLines - 1 ? 'h-4 w-3/4' : 'h-4 w-full'
            }`}
            style={{
              animationDelay: `${index * 0.1}s`,
              animationDuration: '1.5s'
            }}
          />
        ))}
        {message && (
          <p className="text-gray-500 text-sm mt-2">{message}</p>
        )}
      </div>
    );
  }

  if (type === 'pulse') {
    return (
      <div className={`${centered ? 'flex items-center justify-center p-4' : ''} ${className}`}>
        <div className="animate-pulse flex space-x-2">
          <div className="rounded-full bg-orange-400 h-2 w-2"></div>
          <div className="rounded-full bg-orange-400 h-2 w-2"></div>
          <div className="rounded-full bg-orange-400 h-2 w-2"></div>
        </div>
        {message && (
          <p className="text-gray-500 text-sm ml-2">{message}</p>
        )}
      </div>
    );
  }

  return (
    <LoadingSpinner
      size={size}
      message={message}
      className={className}
      centered={centered}
      overlay={overlay}
    />
  );
};