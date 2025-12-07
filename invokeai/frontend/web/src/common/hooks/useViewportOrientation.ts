import { useEffect, useState } from 'react';

export type ViewportOrientation = {
  isVertical: boolean;
  aspectRatio: number;
  viewport: {
    width: number;
    height: number;
  };
};

/**
 * Hook to detect viewport orientation and dimensions.
 * Considers a display "vertical" when aspect ratio < 0.9 (height > width * 1.11)
 * This targets portrait monitors like 9:16, 9:21, etc.
 */
export const useViewportOrientation = (): ViewportOrientation => {
  const [orientation, setOrientation] = useState<ViewportOrientation>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;
    return {
      isVertical: aspectRatio < 0.9,
      aspectRatio,
      viewport: { width, height },
    };
  });

  useEffect(() => {
    const updateOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = width / height;
      setOrientation({
        isVertical: aspectRatio < 0.9,
        aspectRatio,
        viewport: { width, height },
      });
    };

    // Use matchMedia for better performance if available
    const mediaQuery = window.matchMedia('(orientation: portrait)');

    // Modern browsers support addEventListener on MediaQueryList
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateOrientation);
    }

    // Also listen to resize events as fallback
    window.addEventListener('resize', updateOrientation);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateOrientation);
      }
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);

  return orientation;
};
