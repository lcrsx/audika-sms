/**
 * Secure Error Handling Utilities
 * Prevents information disclosure while maintaining proper logging
 */

import { logger } from './logger';

export interface SecureError {
  userMessage: string;
  errorCode?: string;
  context?: string;
}

/**
 * Maps internal errors to user-safe messages
 */
const ERROR_MAP: Record<string, SecureError> = {
  // Database errors
  'PGRST204': {
    userMessage: 'Resursen kunde inte hittas',
    errorCode: 'NOT_FOUND'
  },
  'PGRST116': {
    userMessage: 'Inga resultat hittades',
    errorCode: 'NO_RESULTS'
  },
  'PGRST301': {
    userMessage: 'Åtkomst nekad',
    errorCode: 'ACCESS_DENIED'
  },
  '23505': {
    userMessage: 'Denna resurs finns redan',
    errorCode: 'DUPLICATE'
  },
  '23503': {
    userMessage: 'Kunde inte genomföra åtgärden på grund av beroenden',
    errorCode: 'CONSTRAINT_VIOLATION'
  },
  
  // Network errors
  'NETWORK_ERROR': {
    userMessage: 'Nätverksfel - kontrollera din anslutning',
    errorCode: 'NETWORK'
  },
  'TIMEOUT': {
    userMessage: 'Begäran tog för lång tid - försök igen',
    errorCode: 'TIMEOUT'
  },
  
  // Auth errors
  'INVALID_CREDENTIALS': {
    userMessage: 'Ogiltiga inloggningsuppgifter',
    errorCode: 'AUTH_FAILED'
  },
  'SESSION_EXPIRED': {
    userMessage: 'Din session har löpt ut - logga in igen',
    errorCode: 'SESSION_EXPIRED'
  },
  
  // SMS errors
  'SMS_QUOTA_EXCEEDED': {
    userMessage: 'För många SMS skickade - försök igen senare',
    errorCode: 'QUOTA_EXCEEDED'
  },
  'INVALID_PHONE': {
    userMessage: 'Ogiltigt telefonnummer',
    errorCode: 'INVALID_PHONE'
  },
  
  // Rate limiting
  'RATE_LIMITED': {
    userMessage: 'För många förfrågningar - vänta lite och försök igen',
    errorCode: 'RATE_LIMITED'
  }
};

/**
 * Default error messages by category
 */
const DEFAULT_ERRORS: Record<string, SecureError> = {
  database: {
    userMessage: 'Ett databasfel inträffade - försök igen senare',
    errorCode: 'DATABASE_ERROR'
  },
  network: {
    userMessage: 'Nätverksfel - kontrollera din anslutning',
    errorCode: 'NETWORK_ERROR'
  },
  auth: {
    userMessage: 'Autentiseringsfel - logga in igen',
    errorCode: 'AUTH_ERROR'
  },
  validation: {
    userMessage: 'Ogiltiga data - kontrollera dina uppgifter',
    errorCode: 'VALIDATION_ERROR'
  },
  server: {
    userMessage: 'Ett serverfel inträffade - försök igen senare',
    errorCode: 'SERVER_ERROR'
  },
  sms: {
    userMessage: 'SMS kunde inte skickas - försök igen',
    errorCode: 'SMS_ERROR'
  }
};

/**
 * Safely handles errors and returns user-appropriate messages
 */
export function handleSecureError(
  error: unknown,
  context: string = 'operation',
  category: keyof typeof DEFAULT_ERRORS = 'server'
): SecureError {
  // Generate a unique error reference for tracking
  const errorRef = generateErrorReference();
  
  // Log the full error details server-side
  logger.error(`Error in ${context}`, error as Error, {
    metadata: { errorRef, category }
  });

  // Determine if this is a known error type
  let secureError: SecureError;

  if (error && typeof error === 'object' && 'code' in error) {
    const errorCode = String((error as Record<string, unknown>).code);
    secureError = ERROR_MAP[errorCode] || DEFAULT_ERRORS[category];
  } else if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = String((error as Record<string, unknown>).message);
    
    // Check for specific patterns without exposing internal details
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      secureError = DEFAULT_ERRORS.network;
    } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      secureError = DEFAULT_ERRORS.auth;
    } else if (errorMessage.includes('timeout')) {
      secureError = ERROR_MAP.TIMEOUT;
    } else {
      secureError = DEFAULT_ERRORS[category];
    }
  } else {
    secureError = DEFAULT_ERRORS[category];
  }

  return {
    ...secureError,
    context: errorRef
  };
}

/**
 * Handles SMS service errors securely
 */
export function handleSMSError(error: unknown, httpStatus?: number): SecureError {
  const errorRef = generateErrorReference();
  
  logger.error('SMS service error', error as Error, {
    metadata: { errorRef, httpStatus }
  });

  // Map HTTP status codes to user messages
  if (httpStatus) {
    switch (httpStatus) {
      case 400:
        return {
          userMessage: 'Ogiltiga SMS-uppgifter',
          errorCode: 'INVALID_REQUEST',
          context: errorRef
        };
      case 401:
        return {
          userMessage: 'SMS-tjänsten är inte korrekt konfigurerad',
          errorCode: 'UNAUTHORIZED',
          context: errorRef
        };
      case 429:
        return ERROR_MAP.SMS_QUOTA_EXCEEDED;
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          userMessage: 'SMS-tjänsten är tillfälligt otillgänglig',
          errorCode: 'SERVICE_UNAVAILABLE',
          context: errorRef
        };
      default:
        return DEFAULT_ERRORS.sms;
    }
  }

  return {
    ...DEFAULT_ERRORS.sms,
    context: errorRef
  };
}

/**
 * Handles database errors securely
 */
export function handleDatabaseError(error: unknown): SecureError {
  return handleSecureError(error, 'database operation', 'database');
}

/**
 * Handles API errors securely
 */
export function handleAPIError(error: unknown, endpoint?: string): SecureError {
  const context = endpoint ? `API ${endpoint}` : 'API call';
  return handleSecureError(error, context, 'server');
}

/**
 * Generates a unique error reference for tracking
 */
function generateErrorReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Validates that error messages don't contain sensitive information
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove potentially sensitive patterns
  const sensitivePatterns = [
    /password[s]?[:\s=][^\s]*/gi,
    /token[s]?[:\s=][^\s]*/gi,
    /key[s]?[:\s=][^\s]*/gi,
    /secret[s]?[:\s=][^\s]*/gi,
    /api[_-]?key[s]?[:\s=][^\s]*/gi,
    /connection[:\s=][^\s]*/gi,
    /host[:\s=][^\s]*/gi,
    /port[:\s=][^\s]*/gi,
    /database[:\s=][^\s]*/gi,
    /table[:\s=][^\s]*/gi,
    /column[:\s=][^\s]*/gi,
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email addresses
  ];

  let sanitized = message;
  
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

/**
 * Creates a production-safe error response
 */
export function createErrorResponse(error: unknown, context?: string): {
  success: false;
  error: string;
  errorCode?: string;
  reference?: string;
} {
  const secureError = handleSecureError(error, context);
  
  return {
    success: false,
    error: secureError.userMessage,
    errorCode: secureError.errorCode,
    reference: secureError.context
  };
}