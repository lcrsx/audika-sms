/**
 * Production-Safe Logging Utility
 * Replaces console.log statements with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  private shouldLog(level: LogLevel): boolean {
    // Never log in test environment
    if (this.isTest) return false;
    
    // In production, only log warnings and errors
    if (!this.isDevelopment && (level === 'debug' || level === 'info')) {
      return false;
    }
    
    return true;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${contextStr}`.trim();
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorDetails = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : { error };
      
      console.error(this.formatMessage('error', message, { ...context, ...errorDetails }));
    }
  }

  // Specialized logging methods for common use cases
  sms(action: string, data: { phone?: string; content?: string; [key: string]: unknown }): void {
    const sanitizedData = {
      ...data,
      phone: data.phone ? `${data.phone.slice(0, 3)}***${data.phone.slice(-2)}` : undefined,
      content: data.content ? `${data.content.slice(0, 20)}...` : undefined,
    };
    
    this.info(`SMS ${action}`, { action: 'sms', metadata: sanitizedData });
  }

  auth(action: string, userId?: string): void {
    this.info(`Auth ${action}`, { action: 'auth', userId });
  }

  db(action: string, table?: string, error?: Error): void {
    if (error) {
      this.error(`Database ${action} failed`, error, { action: 'db', metadata: { table } });
    } else {
      this.debug(`Database ${action}`, { action: 'db', metadata: { table } });
    }
  }

  security(message: string, context?: LogContext): void {
    // Security logs should always be logged regardless of environment
    console.error(this.formatMessage('error', `SECURITY: ${message}`, context));
  }
}

export const logger = new Logger();

// Helper function to safely log sensitive data
export function sanitizeForLog(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  
  const sensitive = ['password', 'token', 'key', 'secret', 'authorization'];
  const result = { ...data } as Record<string, unknown>;
  
  Object.keys(result).forEach(key => {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      result[key] = '[REDACTED]';
    }
  });
  
  return result;
}