import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Configuration for virtual scrolling
 */
export interface VirtualScrollConfig {
  /** Height of each item in pixels */
  itemHeight: number;
  /** Height of the container in pixels */
  containerHeight: number;
  /** Buffer size - number of items to render outside viewport */
  overscan?: number;
  /** Enable horizontal scrolling */
  horizontal?: boolean;
  /** Custom scroll behavior */
  scrollBehavior?: 'auto' | 'smooth';
}

/**
 * Virtual scroll state and methods
 */
export interface VirtualScrollState<T> {
  /** Items currently visible in viewport */
  visibleItems: Array<{
    item: T;
    index: number;
    style: React.CSSProperties;
  }>;
  /** Total height/width of all items */
  totalSize: number;
  /** Start index of visible range */
  startIndex: number;
  /** End index of visible range */
  endIndex: number;
  /** Container ref to attach to scrollable element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Scroll to specific index */
  scrollToIndex: (index: number) => void;
  /** Scroll to top */
  scrollToTop: () => void;
  /** Current scroll position */
  scrollTop: number;
}

/**
 * Advanced virtual scrolling hook optimized for performance
 * Handles thousands of items efficiently for SMS application
 */
export function useVirtualScroll<T>(
  items: T[],
  config: VirtualScrollConfig
): VirtualScrollState<T> {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    horizontal = false,
    scrollBehavior = 'auto'
  } = config;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized calculations for performance
  const calculations = useMemo(() => {
    const totalSize = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return {
      totalSize,
      startIndex,
      endIndex,
      visibleCount: endIndex - startIndex + 1
    };
  }, [items.length, itemHeight, scrollTop, containerHeight, overscan]);

  // Generate visible items with positioning styles
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = calculations;
    const result = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i]) {
        const offset = i * itemHeight;
        result.push({
          item: items[i],
          index: i,
          style: horizontal ? {
            position: 'absolute' as const,
            left: offset,
            width: itemHeight,
            height: '100%'
          } : {
            position: 'absolute' as const,
            top: offset,
            height: itemHeight,
            width: '100%'
          }
        });
      }
    }
    
    return result;
  }, [items, calculations, itemHeight, horizontal]);

  // Handle scroll events with throttling
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    const newScrollTop = horizontal ? target.scrollLeft : target.scrollTop;
    
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [horizontal]);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use passive listeners for better performance
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const offset = Math.max(0, Math.min(index * itemHeight, calculations.totalSize - containerHeight));
    
    if (horizontal) {
      container.scrollTo({
        left: offset,
        behavior: scrollBehavior
      });
    } else {
      container.scrollTo({
        top: offset,
        behavior: scrollBehavior
      });
    }
  }, [itemHeight, calculations.totalSize, containerHeight, horizontal, scrollBehavior]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    scrollToIndex(0);
  }, [scrollToIndex]);

  // Reset scroll position when items change significantly
  useEffect(() => {
    if (items.length === 0) {
      setScrollTop(0);
    }
  }, [items.length]);

  return {
    visibleItems,
    totalSize: calculations.totalSize,
    startIndex: calculations.startIndex,
    endIndex: calculations.endIndex,
    containerRef,
    scrollToIndex,
    scrollToTop,
    scrollTop
  };
}

/**
 * Virtual list component wrapper
 */
export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (props: {
    item: T;
    index: number;
    style: React.CSSProperties;
  }) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className = '',
  overscan = 5,
  onScroll,
  loadingComponent,
  emptyComponent
}: VirtualListProps<T>) {
  const {
    visibleItems,
    totalSize,
    containerRef,
    scrollTop
  } = useVirtualScroll(items, {
    itemHeight,
    containerHeight: height,
    overscan
  });

  // Notify parent of scroll changes
  useEffect(() => {
    onScroll?.(scrollTop);
  }, [scrollTop, onScroll]);

  if (items.length === 0 && emptyComponent) {
    return React.createElement('div', { 
      className, 
      style: { height } 
    }, emptyComponent);
  }

  return React.createElement('div', {
    ref: containerRef,
    className: `virtual-scroll-container overflow-auto ${className}`,
    style: { height }
  }, 
    React.createElement('div', {
      style: { height: totalSize, position: 'relative' }
    },
      visibleItems.map(({ item, index, style }) => 
        React.createElement('div', { 
          key: index, 
          style 
        }, renderItem({ item, index, style }))
      ),
      loadingComponent && React.createElement('div', {
        className: 'absolute bottom-0 left-0 right-0 flex justify-center py-4'
      }, loadingComponent)
    )
  );
}

/**
 * Infinite scroll hook for virtual lists
 */
export function useInfiniteVirtualScroll<T>(
  loadMore: () => Promise<T[]>,
  options: {
    threshold?: number; // Distance from bottom to trigger load
    enabled?: boolean;
  } = {}
) {
  const { threshold = 200, enabled = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  const handleScroll = useCallback(async (scrollTop: number, totalSize: number, containerHeight: number) => {
    if (!enabled || !hasMore || loadingRef.current) return;

    const scrollBottom = scrollTop + containerHeight;
    const shouldLoad = totalSize - scrollBottom <= threshold;

    if (shouldLoad) {
      loadingRef.current = true;
      setIsLoading(true);

      try {
        const newItems = await loadMore();
        if (newItems.length === 0) {
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error loading more items:', error);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    }
  }, [enabled, hasMore, threshold, loadMore]);

  return {
    isLoading,
    hasMore,
    handleScroll,
    reset: () => {
      setIsLoading(false);
      setHasMore(true);
      loadingRef.current = false;
    }
  };
}