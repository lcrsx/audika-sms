/**
 * Search Query Sanitization Utilities
 * Prevents SQL injection in search queries
 */

/**
 * Sanitizes a search query for use in SQL LIKE operations
 * Escapes special SQL characters and validates input
 */
export function sanitizeSearchQuery(query: string): {
  sanitized: string;
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Basic validation
  if (!query || typeof query !== 'string') {
    return {
      sanitized: '',
      isValid: false,
      errors: ['Query must be a non-empty string']
    };
  }
  
  // Trim and check length
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return {
      sanitized: '',
      isValid: false,
      errors: ['Query cannot be empty']
    };
  }
  
  if (trimmed.length > 100) {
    return {
      sanitized: '',
      isValid: false,
      errors: ['Query too long (max 100 characters)']
    };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /;\s*(drop|delete|insert|update|create|alter|truncate)/i,
    /union\s+select/i,
    /exec(\s|\()/i,
    /script\s*>/i,
    /javascript:/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      errors.push('Query contains potentially malicious content');
      break;
    }
  }
  
  // Escape SQL LIKE special characters
  // Escape backslashes first, then other special chars
  const sanitized = trimmed
    .replace(/\\/g, '\\\\')  // Escape existing backslashes
    .replace(/%/g, '\\%')    // Escape percent signs
    .replace(/_/g, '\\_');   // Escape underscores
  
  return {
    sanitized,
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a safe LIKE pattern for database queries
 */
export function createLikePattern(query: string, matchType: 'contains' | 'starts' | 'ends' = 'contains'): string {
  const { sanitized, isValid } = sanitizeSearchQuery(query);
  
  if (!isValid) {
    throw new Error('Invalid search query');
  }
  
  switch (matchType) {
    case 'starts':
      return `${sanitized}%`;
    case 'ends':
      return `%${sanitized}`;
    case 'contains':
    default:
      return `%${sanitized}%`;
  }
}

/**
 * Validates phone number search queries
 */
export function sanitizePhoneSearch(query: string): {
  sanitized: string;
  isValid: boolean;
  errors: string[];
} {
  // Remove non-digits first
  const digitsOnly = query.replace(/\D/g, '');
  
  if (digitsOnly.length < 3) {
    return {
      sanitized: '',
      isValid: false,
      errors: ['Phone search requires at least 3 digits']
    };
  }
  
  if (digitsOnly.length > 15) {
    return {
      sanitized: '',
      isValid: false,
      errors: ['Phone number too long']
    };
  }
  
  return {
    sanitized: digitsOnly,
    isValid: true,
    errors: []
  };
}