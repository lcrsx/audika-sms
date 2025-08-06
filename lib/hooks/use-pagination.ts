import { useState, useMemo } from 'react';

/**
 * Configuration for pagination behavior
 */
export interface PaginationConfig {
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Total number of items */
  totalItems: number;
}

/**
 * Pagination state and controls
 */
export interface PaginationState {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Index of first item on current page (0-indexed) */
  startIndex: number;
  /** Index of last item on current page (0-indexed) */
  endIndex: number;
  /** Whether there is a previous page */
  hasPrevious: boolean;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  previousPage: () => void;
  /** Go to first page */
  firstPage: () => void;
  /** Go to last page */
  lastPage: () => void;
  /** Set page size and reset to first page */
  setPageSize: (size: number) => void;
  /** Get page numbers for pagination UI */
  getPageNumbers: () => number[];
}

/**
 * Custom hook for pagination logic
 * Optimized for large datasets and high concurrency
 */
export function usePagination(config: PaginationConfig): PaginationState {
  const { pageSize = 20, initialPage = 1, totalItems } = config;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  // Memoized calculations to prevent unnecessary re-renders
  const paginationData = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    
    const startIndex = (safePage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1);
    
    return {
      totalPages,
      safePage,
      startIndex,
      endIndex,
      hasPrevious: safePage > 1,
      hasNext: safePage < totalPages
    };
  }, [currentPage, itemsPerPage, totalItems]);

  const goToPage = (page: number) => {
    const safePage = Math.min(Math.max(1, page), paginationData.totalPages);
    setCurrentPage(safePage);
  };

  const nextPage = () => {
    if (paginationData.hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (paginationData.hasPrevious) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const firstPage = () => {
    setCurrentPage(1);
  };

  const lastPage = () => {
    setCurrentPage(paginationData.totalPages);
  };

  const setPageSize = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Generate page numbers for pagination UI
  const getPageNumbers = (): number[] => {
    const { totalPages, safePage } = paginationData;
    const delta = 2; // Show 2 pages before and after current page
    const range = [];
    const rangeWithDots = [];

    // Calculate range
    for (
      let i = Math.max(2, safePage - delta);
      i <= Math.min(totalPages - 1, safePage + delta);
      i++
    ) {
      range.push(i);
    }

    // Add first page
    if (safePage - delta > 2) {
      rangeWithDots.push(1, -1); // -1 represents dots
    } else {
      rangeWithDots.push(1);
    }

    // Add middle range
    rangeWithDots.push(...range);

    // Add last page
    if (safePage + delta < totalPages - 1) {
      rangeWithDots.push(-1, totalPages); // -1 represents dots
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return {
    currentPage: paginationData.safePage,
    pageSize: itemsPerPage,
    totalPages: paginationData.totalPages,
    totalItems,
    startIndex: paginationData.startIndex,
    endIndex: paginationData.endIndex,
    hasPrevious: paginationData.hasPrevious,
    hasNext: paginationData.hasNext,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    getPageNumbers
  };
}

/**
 * Helper function to paginate an array of items
 */
export function paginateArray<T>(
  items: T[],
  currentPage: number,
  pageSize: number
): T[] {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return items.slice(startIndex, endIndex);
}