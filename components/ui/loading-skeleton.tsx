'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-100 dark:bg-slate-800',
        className
      )}
      {...props}
    />
  );
}

/**
 * Enhanced skeleton with shimmer effect
 */
export function ShimmerSkeleton({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800',
        className
      )}
      {...props}
    >
      {children}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}

/**
 * Message card skeleton for historik page
 */
export function MessageSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <ShimmerSkeleton className="w-20 h-6 rounded-full" />
          <ShimmerSkeleton className="w-16 h-4 rounded" />
        </div>
        <ShimmerSkeleton className="w-32 h-10 rounded-2xl" />
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <ShimmerSkeleton className="h-16 rounded-2xl" />
        <ShimmerSkeleton className="h-16 rounded-2xl" />
      </div>

      {/* Message content */}
      <ShimmerSkeleton className="h-20 rounded-2xl mb-4" />
      
      {/* Template badge */}
      <div className="flex justify-center">
        <ShimmerSkeleton className="w-40 h-8 rounded-xl" />
      </div>
    </motion.div>
  );
}

/**
 * Patient card skeleton
 */
export function PatientSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/30 dark:border-gray-700/30"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <ShimmerSkeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        
        <div className="flex-1 space-y-3">
          {/* Name and status */}
          <div className="flex items-center justify-between">
            <ShimmerSkeleton className="w-32 h-6" />
            <ShimmerSkeleton className="w-20 h-6 rounded-full" />
          </div>
          
          {/* Contact info */}
          <ShimmerSkeleton className="w-40 h-4" />
          <ShimmerSkeleton className="w-24 h-4" />
          
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <ShimmerSkeleton className="w-16 h-8 rounded-lg" />
            <ShimmerSkeleton className="w-16 h-8 rounded-lg" />
            <ShimmerSkeleton className="w-20 h-8 rounded-lg" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Dashboard stats skeleton
 */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="text-center">
          <ShimmerSkeleton className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
          <ShimmerSkeleton className="w-12 h-8 mx-auto mb-1" />
          <ShimmerSkeleton className="w-16 h-4 mx-auto mb-1" />
          <ShimmerSkeleton className="w-20 h-3 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/**
 * SMS form skeleton
 */
export function SMSFormSkeleton() {
  return (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl p-8 border border-white/30 dark:border-slate-700/30 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <ShimmerSkeleton className="w-16 h-16 mx-auto rounded-full" />
        <ShimmerSkeleton className="w-48 h-8 mx-auto" />
        <ShimmerSkeleton className="w-64 h-4 mx-auto" />
      </div>
      
      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <ShimmerSkeleton className="w-20 h-4 mb-2" />
          <ShimmerSkeleton className="w-full h-12 rounded-xl" />
        </div>
        
        <div>
          <ShimmerSkeleton className="w-24 h-4 mb-2" />
          <ShimmerSkeleton className="w-full h-32 rounded-xl" />
        </div>
        
        <div className="flex items-center gap-4">
          <ShimmerSkeleton className="w-32 h-10 rounded-xl" />
          <ShimmerSkeleton className="w-24 h-10 rounded-xl" />
        </div>
        
        <ShimmerSkeleton className="w-full h-12 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * List skeleton with multiple items
 */
export function ListSkeleton({ 
  count = 5, 
  itemHeight = 100,
  className = ''
}: { 
  count?: number; 
  itemHeight?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerSkeleton
          key={i}
          className="w-full rounded-2xl"
          style={{ height: itemHeight }}
        />
      ))}
    </div>
  );
}

/**
 * Table skeleton
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className = ''
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerSkeleton key={i} className="flex-1 h-6 rounded" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <ShimmerSkeleton key={colIndex} className="flex-1 h-8 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Navigation skeleton
 */
export function NavigationSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <ShimmerSkeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <ShimmerSkeleton className="w-32 h-4" />
        <ShimmerSkeleton className="w-24 h-3" />
      </div>
      <ShimmerSkeleton className="w-20 h-8 rounded-lg" />
    </div>
  );
}

/**
 * Card grid skeleton
 */
export function CardGridSkeleton({ 
  count = 6,
  columns = 3,
  className = ''
}: { 
  count?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`grid gap-6 ${
      columns === 2 ? 'grid-cols-1 md:grid-cols-2' :
      columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
      columns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
      'grid-cols-1 md:grid-cols-3'
    } ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <ShimmerSkeleton className="w-12 h-12 rounded-full mb-4" />
          <ShimmerSkeleton className="w-3/4 h-6 mb-2" />
          <ShimmerSkeleton className="w-full h-4 mb-4" />
          <ShimmerSkeleton className="w-1/2 h-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}