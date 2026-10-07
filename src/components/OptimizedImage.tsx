
import { useState, useEffect, useRef, memo } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
}

const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = '',
  priority = false,
  width,
  height,
  loading = 'lazy'
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // АГРЕСИВНА WebP оптимизация с компресия
    const optimizedSrc = src.includes('readdy.ai/api/search-image') 
      ? `${src}&format=webp&quality=75&compress=true`
      : src;
    
    if (priority) {
      // Мигновено зареждане за критичните изображения
      setImageSrc(optimizedSrc);
      // Preload за още по-бързо зареждане
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedSrc;
      document.head.appendChild(link);
    } else {
      // Екстремно агресивен Intersection Observer
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(optimizedSrc);
              observer.disconnect();
            }
          });
        },
        { 
          rootMargin: '100px', // По-голям margin за по-ранно зареждане
          threshold: 0.01 // Минимален threshold
        }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => observer.disconnect();
    }
  }, [src, priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    // Cache изображението в browser cache
    if ('caches' in window) {
      caches.open('images-cache-v1').then(cache => {
        cache.add(imageSrc);
      });
    }
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  if (hasError) {
    return (
      <div 
        ref={imgRef}
        className={`${className} bg-gray-200 flex items-center justify-center`}
        style={{ width, height }}
      >
        <i className="ri-image-line text-gray-400 text-2xl"></i>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && (
        <div 
          className={`${className} skeleton`}
          style={{ width, height }}
        />
      )}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={`${className} ${!isLoaded ? 'opacity-0 absolute' : 'opacity-100'} transition-opacity duration-200`}
        onLoad={handleLoad}
        onError={handleError}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: `${width}px ${height}px`
        }}
      />
    </>
  );
});

export default OptimizedImage;
