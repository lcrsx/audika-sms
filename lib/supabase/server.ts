'use server'

import { createPooledClient, getPoolStats } from '@/lib/utils/connection-pool';

/**
 * Creates a Supabase client for server-side operations with connection pooling.
 * Prevents database connection exhaustion by reusing clients.
 * Only use in Server Components or Server Actions.
 */
export async function createClient(userId?: string) {
  return createPooledClient(userId);
}

/**
 * Get database connection pool statistics (for monitoring)
 */
export async function getConnectionStats() {
  return getPoolStats();
}
