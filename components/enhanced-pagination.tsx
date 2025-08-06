'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from './ui/pagination';
import { PaginationState } from '@/lib/hooks/use-pagination';

interface EnhancedPaginationProps {
  pagination: PaginationState;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * Enhanced pagination component that combines shadcn/ui primitives 
 * with our custom pagination logic for optimal performance
 */
export function EnhancedPagination({
  pagination,
  showPageSizeSelector = true,
  pageSizeOptions = [10, 20, 50, 100],
  className = ''
}: EnhancedPaginationProps) {
  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    hasPrevious,
    hasNext,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    getPageNumbers,
    startIndex,
    endIndex
  } = pagination;

  // Don't render if there's only one page and no items
  if (totalPages <= 1 && totalItems === 0) {
    return null;
  }

  const pageNumbers = getPageNumbers();
  const actualEndIndex = Math.min(endIndex + 1, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 ${className}`}>
      {/* Results info and page size selector */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        <span>
          Visar {totalItems > 0 ? startIndex + 1 : 0}-{actualEndIndex} av {totalItems}
        </span>
        {showPageSizeSelector && totalItems > Math.min(...pageSizeOptions) && (
          <>
            <span>•</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(parseInt(value))}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>per sida</span>
          </>
        )}
      </div>

      {/* Navigation controls using shadcn primitives */}
      {totalPages > 1 && (
        <Pagination className="w-auto">
          <PaginationContent>
            {/* Previous page */}
            <PaginationItem>
              <PaginationPrevious 
                onClick={previousPage}
                className={!hasPrevious ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>

            {/* Page numbers */}
            {pageNumbers.map((pageNum, index) => (
              <PaginationItem key={pageNum === -1 ? `dots-${index}` : pageNum}>
                {pageNum === -1 ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => goToPage(pageNum)}
                    isActive={pageNum === currentPage}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            {/* Next page */}
            <PaginationItem>
              <PaginationNext 
                onClick={nextPage}
                className={!hasNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

/**
 * Compact version for mobile/constrained spaces
 */
export function EnhancedPaginationCompact({
  pagination,
  className = ''
}: {
  pagination: PaginationState;
  className?: string;
}) {
  const {
    currentPage,
    totalPages,
    totalItems,
    hasPrevious,
    hasNext,
    nextPage,
    previousPage,
    startIndex,
    endIndex
  } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  const actualEndIndex = Math.min(endIndex + 1, totalItems);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {startIndex + 1}-{actualEndIndex} av {totalItems}
      </div>

      <Pagination className="w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={previousPage}
              className={!hasPrevious ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          
          <PaginationItem>
            <span className="flex items-center px-4 text-sm font-medium">
              Sida {currentPage} av {totalPages}
            </span>
          </PaginationItem>

          <PaginationItem>
            <PaginationNext 
              onClick={nextPage}
              className={!hasNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}