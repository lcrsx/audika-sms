/**
 * Simple logging utility for Audika SMS
 */

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string | number;
  };
}

class SimpleLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    } else {
      console.info(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date().toISOString() }));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    } else {
      console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() }));
    }
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error ? { message: String(error) } : undefined;

    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, errorInfo, context ? JSON.stringify(context, null, 2) : '');
    } else {      
      console.error(JSON.stringify({ 
        level: 'error', 
        message, 
        error: errorInfo,
        ...context, 
        timestamp: new Date().toISOString() 
      }));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  }

  // SMS-specific logging
  sms(action: string, data: { phone?: string; messageId?: string; status?: string; [key: string]: unknown }): void {
    const sanitizedData = {
      ...data,
      phone: data.phone ? this.maskPhone(data.phone) : undefined,
    };
    
    this.info(`SMS ${action}`, { action: 'sms', metadata: sanitizedData });
  }

  // Auth-specific logging
  auth(action: string, context?: { userId?: string; email?: string; success?: boolean }): void {
    const sanitizedContext = {
      ...context,
      email: context?.email ? this.maskEmail(context.email) : undefined,
    };
    
    const level = context?.success === false ? 'warn' : 'info';
    this[level](`Auth ${action}`, { action: 'auth', metadata: sanitizedContext });
  }

  // Database-specific logging
  database(action: string, details?: { table?: string; operation?: string; duration?: number; error?: unknown }): void {
    if (details?.error) {
      this.error(`Database ${action} failed`, details.error, { 
        action: 'database', 
        metadata: { table: details.table, operation: details.operation, duration: details.duration }
      });
    } else {
      this.debug(`Database ${action}`, { 
        action: 'database', 
        metadata: details 
      });
    }
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 6) return '***';
    return `${phone.slice(0, 3)}***${phone.slice(-2)}`;
  }

  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (!username || !domain) return '***@***.***';
    
    const maskedUsername = username.length > 2 
      ? `${username[0]}***${username.slice(-1)}`
      : '***';
      
    return `${maskedUsername}@${domain}`;
  }
}

export const logger = new SimpleLogger();
export default logger;