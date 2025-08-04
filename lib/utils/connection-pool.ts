/**
 * Database Connection Pool Manager
 * Prevents connection exhaustion and manages client reuse
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { logger } from './logger';

interface PooledClient {
  client: ReturnType<typeof createServerClient<Database>>;
  created: number;
  lastUsed: number;
  requestCount: number;
}

interface ConnectionPool {
  clients: Map<string, PooledClient>;
  maxConnections: number;
  maxAge: number; // milliseconds
  maxRequests: number; // per client
}

// Connection pool configuration
const POOL_CONFIG = {
  maxConnections: 10, // Maximum concurrent connections
  maxAge: 30 * 60 * 1000, // 30 minutes
  maxRequests: 100, // Max requests per client before recreation
  cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
};

// Global connection pool
let connectionPool: ConnectionPool | null = null;

/**
 * Initialize the connection pool
 */
function initializePool(): ConnectionPool {
  if (connectionPool) {
    return connectionPool;
  }

  connectionPool = {
    clients: new Map(),
    maxConnections: POOL_CONFIG.maxConnections,
    maxAge: POOL_CONFIG.maxAge,
    maxRequests: POOL_CONFIG.maxRequests,
  };

  // Setup periodic cleanup
  if (typeof window === 'undefined') {
    setInterval(() => {
      cleanupExpiredClients();
    }, POOL_CONFIG.cleanupInterval);
  }

  logger.info('Database connection pool initialized', {
    metadata: { maxConnections: POOL_CONFIG.maxConnections }
  });

  return connectionPool;
}

/**
 * Generate a client key based on user context
 */
function generateClientKey(userId?: string): string {
  // Use process ID and user ID for key generation
  const processId = process.pid || 'unknown';
  const userKey = userId || 'anonymous';
  return `${processId}-${userKey}`;
}

/**
 * Clean up expired or overused clients
 */
function cleanupExpiredClients(): void {
  if (!connectionPool) return;

  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, pooledClient] of connectionPool.clients.entries()) {
    const isExpired = (now - pooledClient.created) > POOL_CONFIG.maxAge;
    const isOverused = pooledClient.requestCount > POOL_CONFIG.maxRequests;
    
    if (isExpired || isOverused) {
      connectionPool.clients.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info('Cleaned up database connections', {
      metadata: { cleanedCount, remaining: connectionPool.clients.size }
    });
  }
}

/**
 * Create or reuse a Supabase client with connection pooling
 */
export async function createPooledClient(userId?: string) {
  try {
    const pool = initializePool();
    const clientKey = generateClientKey(userId);
    const now = Date.now();

    // Check if we have a valid cached client
    const existingClient = pool.clients.get(clientKey);
    
    if (existingClient) {
      const isValid = (now - existingClient.created) < POOL_CONFIG.maxAge &&
                     existingClient.requestCount < POOL_CONFIG.maxRequests;
      
      if (isValid) {
        existingClient.lastUsed = now;
        existingClient.requestCount++;
        return existingClient.client;
      } else {
        // Remove expired/overused client
        pool.clients.delete(clientKey);
      }
    }

    // Check pool size limit
    if (pool.clients.size >= pool.maxConnections) {
      // Remove oldest client to make room
      const oldestKey = [...pool.clients.entries()]
        .sort(([,a], [,b]) => a.lastUsed - b.lastUsed)[0][0];
      
      pool.clients.delete(oldestKey);
      logger.warn('Connection pool full, removed oldest client', {
        metadata: { poolSize: pool.clients.size }
      });
    }

    // Create new client
    const cookieStore = await cookies();
    
    const client = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Ignore cookie setting errors in Server Components
              logger.debug('Cookie setting failed (expected in Server Components)', {
                metadata: { error: (error as Error).message }
              });
            }
          },
        },
      }
    );

    // Add to pool
    pool.clients.set(clientKey, {
      client,
      created: now,
      lastUsed: now,
      requestCount: 1,
    });

    logger.debug('Created new pooled database client', {
      metadata: { clientKey, poolSize: pool.clients.size }
    });

    return client;

  } catch (error) {
    logger.error('Failed to create pooled client', error as Error);
    
    // Fallback to direct client creation
    const cookieStore = await cookies();
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Ignore errors
            }
          },
        },
      }
    );
  }
}

/**
 * Get connection pool statistics
 */
export function getPoolStats(): {
  totalConnections: number;
  activeConnections: number;
  oldestConnection: number;
  newestConnection: number;
} {
  if (!connectionPool) {
    return {
      totalConnections: 0,
      activeConnections: 0,
      oldestConnection: 0,
      newestConnection: 0,
    };
  }

  const now = Date.now();
  const clients = [...connectionPool.clients.values()];
  
  const activeConnections = clients.filter(
    client => (now - client.lastUsed) < 60000 // Active in last minute
  ).length;

  const ages = clients.map(client => now - client.created);
  
  return {
    totalConnections: clients.length,
    activeConnections,
    oldestConnection: ages.length > 0 ? Math.max(...ages) : 0,
    newestConnection: ages.length > 0 ? Math.min(...ages) : 0,
  };
}

/**
 * Force cleanup of all connections (for testing/maintenance)
 */
export function clearConnectionPool(): void {
  if (connectionPool) {
    const count = connectionPool.clients.size;
    connectionPool.clients.clear();
    logger.info('Connection pool cleared', { metadata: { clearedCount: count } });
  }
}

/**
 * Enhanced createClient function with connection pooling
 * This replaces the original createClient function
 */
export async function createClient(userId?: string) {
  return createPooledClient(userId);
}

// Monitor pool health
if (typeof window === 'undefined') {
  setInterval(() => {
    const stats = getPoolStats();
    if (stats.totalConnections > 0) {
      logger.debug('Connection pool status', { metadata: stats });
    }
  }, 10 * 60 * 1000); // Every 10 minutes
}