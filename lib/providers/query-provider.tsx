'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

/**
 * React Query Provider component that wraps the app with query client
 * Provides data fetching, caching, and synchronization capabilities
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create a stable query client instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: how long queries stay fresh
            staleTime: 1000 * 60 * 5, // 5 minutes
            // Cache time: how long inactive queries are cached
            cacheTime: 1000 * 60 * 30, // 30 minutes
            // Retry failed requests
            retry: 3,
            // Refetch on window focus
            refetchOnWindowFocus: false,
            // Refetch on reconnect
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry failed mutations
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}