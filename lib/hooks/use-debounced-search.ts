import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for debouncing search input
 * @param initialValue Initial search value
 * @param delay Debounce delay in milliseconds (default: 300)
 * @returns Object with searchTerm, debouncedSearchTerm, and setSearchTerm
 */
export function useDebouncedSearch(initialValue: string = '', delay: number = 300) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, delay]);

  const updateSearchTerm = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm: updateSearchTerm,
    clearSearch,
    isSearching: searchTerm !== debouncedSearchTerm
  };
}