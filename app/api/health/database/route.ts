import { NextResponse } from 'next/server';
import { getConnectionStats } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

/**
 * Database health check endpoint
 * GET /api/health/database
 */
export async function GET() {
  try {
    const stats = await getConnectionStats();
    
    // Determine health status
    const isHealthy = stats.totalConnections < 8; // Warn at 80% capacity
    const status = isHealthy ? 'healthy' : 'warning';
    
    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      database: {
        connectionPool: {
          total: stats.totalConnections,
          active: stats.activeConnections,
          maxConnections: 10,
          utilization: Math.round((stats.totalConnections / 10) * 100),
          oldestConnectionAge: Math.round(stats.oldestConnection / 1000), // seconds
          newestConnectionAge: Math.round(stats.newestConnection / 1000), // seconds
        }
      }
    };
    
    // Log health status
    logger.info('Database health check', { metadata: healthData });
    
    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}