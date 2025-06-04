"use client";

import React, { useState } from 'react';

interface HighQualityImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
}

/**
 * HighQualityImage component ensures images are displayed in high quality
 * without Next.js image optimization that might reduce quality.
 */
export function HighQualityImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  width,
  height,
  objectFit = 'contain',
  loading = 'lazy',
}: HighQualityImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div 
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ 
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto'
      }}
    >
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-pulse">
          <span className="sr-only">Loading...</span>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Failed to load image
          </span>
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${className}`}
        style={{
          objectFit,
          opacity: isLoading || error ? 0 : 1,
          width: '100%',
          height: '100%',
          imageRendering: 'auto',
          WebkitImageSmoothing: 'high',
          imageSmoothing: 'high',
        }}
        loading={loading}
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}

export default HighQualityImage; 