import { createClient } from '@/lib/supabase/client';

/**
 * Database optimization utilities for better performance
 */

/**
 * Optimized query builder for messages
 */
export class MessageQueryBuilder {
  private supabase = createClient();

  /**
   * Get user's recent messages with optimized query
   */
  async getUserMessages(userId: string, options: {
    limit?: number;
    offset?: number;
    status?: string;
    afterDate?: string;
  } = {}) {
    const { limit = 20, offset = 0, status, afterDate } = options;

    let query = this.supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        status,
        recipient_phone,
        patient_cnumber,
        sender_display_name,
        patients!inner (
          cnumber
        )
      `)
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (afterDate) {
      query = query.gte('created_at', afterDate);
    }

    return query;
  }

  /**
   * Get patient message history with optimized query
   */
  async getPatientMessages(patientCNumber: string, options: {
    limit?: number;
    offset?: number;
  } = {}) {
    const { limit = 50, offset = 0 } = options;

    return this.supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        status,
        sender_display_name,
        sender_tag
      `)
      .eq('patient_cnumber', patientCNumber)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
  }

  /**
   * Get message statistics efficiently
   */
  async getMessageStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Use parallel queries for better performance
    const [totalResult, todayResult, weekResult, monthResult] = await Promise.all([
      this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', userId),
      
      this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .gte('created_at', today.toISOString()),
      
      this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .gte('created_at', weekAgo.toISOString()),
      
      this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .gte('created_at', monthAgo.toISOString())
    ]);

    return {
      total: totalResult.count || 0,
      today: todayResult.count || 0,
      thisWeek: weekResult.count || 0,
      thisMonth: monthResult.count || 0
    };
  }
}

/**
 * Optimized query builder for patients
 */
export class PatientQueryBuilder {
  private supabase = createClient();

  /**
   * Search patients with optimized query
   */
  async searchPatients(query: string, options: {
    limit?: number;
    activeOnly?: boolean;
  } = {}) {
    const { limit = 10, activeOnly = true } = options;

    let dbQuery = this.supabase
      .from('patients')
      .select(`
        id,
        cnumber,
        city,
        is_active,
        last_contact_at,
        created_by,
        created_at,
        patient_phones (
          id,
          phone,
          label,
          patient_id
        )
      `)
      .ilike('cnumber', `%${query}%`)
      .order('last_contact_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (activeOnly) {
      dbQuery = dbQuery.eq('is_active', true);
    }

    return dbQuery;
  }

  /**
   * Get recently contacted patients
   */
  async getRecentPatients(userId: string, limit = 10) {
    return this.supabase
      .from('patients')
      .select(`
        id,
        cnumber,
        city,
        is_active,
        last_contact_at,
        patient_phones (
          phone,
          label
        )
      `)
      .eq('created_by', userId)
      .eq('is_active', true)
      .not('last_contact_at', 'is', null)
      .order('last_contact_at', { ascending: false })
      .limit(limit);
  }

  /**
   * Get patient statistics
   */
  async getPatientStats(userId?: string) {
    let query = this.supabase
      .from('patients')
      .select('id, is_active, created_at', { count: 'exact' });

    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    const total = count || 0;
    const active = data?.filter(p => p.is_active).length || 0;
    const thisMonth = data?.filter(p => {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return new Date(p.created_at) >= monthAgo;
    }).length || 0;

    return {
      total,
      active,
      inactive: total - active,
      thisMonth
    };
  }
}

/**
 * Optimized query builder for templates
 */
export class TemplateQueryBuilder {
  private supabase = createClient();

  /**
   * Get popular templates with optimized query
   */
  async getPopularTemplates(limit = 10) {
    return this.supabase
      .from('message_templates')
      .select(`
        id,
        name,
        content,
        description,
        use_count,
        tags
      `)
      .order('use_count', { ascending: false })
      .limit(limit);
  }

  /**
   * Search templates by content or name
   */
  async searchTemplates(query: string, limit = 10) {
    // Use full-text search for better performance
    return this.supabase
      .from('message_templates')
      .select(`
        id,
        name,
        content,
        description,
        use_count,
        tags
      `)
      .or(`name.ilike.%${query}%,content.ilike.%${query}%`)
      .order('use_count', { ascending: false })
      .limit(limit);
  }

  /**
   * Increment template usage count
   */
  async incrementUsage(templateId: string) {
    return this.supabase.rpc('increment_template_usage', {
      template_id: templateId
    });
  }
}

/**
 * Optimized query builder for chat
 */
export class ChatQueryBuilder {
  private supabase = createClient();

  /**
   * Get recent chat messages with optimized query
   */
  async getRecentMessages(roomName = 'global', options: {
    limit?: number;
    offset?: number;
    afterTimestamp?: string;
  } = {}) {
    const { limit = 50, offset = 0, afterTimestamp } = options;

    let query = this.supabase
      .from('chat')
      .select(`
        id,
        content,
        username,
        room_name,
        created_at,
        user_id
      `)
      .eq('room_name', roomName)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (afterTimestamp) {
      query = query.gt('created_at', afterTimestamp);
    }

    return query;
  }

  /**
   * Get user's recent chat activity
   */
  async getUserActivity(userId: string, limit = 20) {
    return this.supabase
      .from('chat')
      .select(`
        id,
        content,
        room_name,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
  }
}

/**
 * Database performance monitoring utilities
 */
export class PerformanceMonitor {
  private supabase = createClient();

  /**
   * Check query performance and suggest optimizations
   */
  async analyzeQueryPerformance() {
    // This would typically run EXPLAIN ANALYZE on queries
    // For now, we'll check table sizes and suggest optimizations
    
    try {
      const tables = ['messages', 'patients', 'chat', 'message_templates', 'users'];
      const stats = [];

      for (const table of tables) {
        const { count } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        stats.push({
          table,
          rows: count || 0
        });
      }

      return {
        tableStats: stats,
        recommendations: this.generateRecommendations(stats)
      };
    } catch (error) {
      console.error('Error analyzing performance:', error);
      return null;
    }
  }

  private generateRecommendations(stats: Array<{ table: string; rows: number }>) {
    const recommendations: Array<{ table: string; issue: string; recommendation: string }> = [];

    stats.forEach(({ table, rows }) => {
      if (rows > 100000) {
        recommendations.push({
          table,
          issue: 'Large table size',
          recommendation: `Consider archiving old data from ${table} table (${rows.toLocaleString()} rows)`
        });
      }

      if (table === 'messages' && rows > 50000) {
        recommendations.push({
          table,
          issue: 'Message table growth',
          recommendation: 'Implement message archiving for messages older than 6 months'
        });
      }

      if (table === 'chat' && rows > 10000) {
        recommendations.push({
          table,
          issue: 'Chat history growth',
          recommendation: 'Consider implementing chat message retention policy'
        });
      }
    });

    return recommendations;
  }

  /**
   * Monitor slow queries (would need database-level monitoring in production)
   */
  async getSlowQuerySuggestions() {
    return [
      {
        query: 'Patient search without indexes',
        suggestion: 'Ensure case-insensitive indexes exist on patient.cnumber'
      },
      {
        query: 'Message history without limits',
        suggestion: 'Always use LIMIT clauses and pagination for message queries'
      },
      {
        query: 'Full table scans on large tables',
        suggestion: 'Add WHERE clauses with indexed columns before ORDER BY'
      }
    ];
  }
}

// Export singleton instances
export const messageQuery = new MessageQueryBuilder();
export const patientQuery = new PatientQueryBuilder();
export const templateQuery = new TemplateQueryBuilder();
export const chatQuery = new ChatQueryBuilder();
export const performanceMonitor = new PerformanceMonitor();