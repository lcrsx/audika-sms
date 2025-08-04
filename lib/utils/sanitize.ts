/**
 * Input Sanitization Utilities
 * Prevents XSS attacks and ensures safe data handling
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';
  
  // Remove all HTML tags except safe ones
  const allowedTags = ['p', 'br', 'strong', 'em', 'u'];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/gi;
  
  return input
    .replace(tagRegex, (match, tagName) => {
      return allowedTags.includes(tagName.toLowerCase()) ? match : '';
    })
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/<link\b[^<]*>/gi, '')
    .replace(/<meta\b[^<]*>/gi, '');
}

/**
 * Sanitize text content for display
 * Removes potentially dangerous characters while preserving readability
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, (match) => match === '<' ? '&lt;' : '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize phone numbers to ensure they contain only valid characters
 */
export function sanitizePhoneNumber(input: string): string {
  if (!input) return '';
  
  // Allow only digits, +, -, spaces, and parentheses
  return input.replace(/[^0-9+\-\s()]/g, '');
}

/**
 * Sanitize SQL query parameters to prevent injection
 */
export function sanitizeSQLParam(input: string): string {
  if (!input) return '';
  
  // Escape special SQL characters
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/[%_\\]/g, '\\$&') // Escape LIKE wildcards
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, ''); // Remove block comment end
}

/**
 * Validate and sanitize SMS content
 */
export function sanitizeSMSContent(input: string): {
  sanitized: string;
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'string') {
    errors.push('SMS content is required');
    return { sanitized: '', isValid: false, errors };
  }
  
  let sanitized = input.trim();
  
  // Remove potentially dangerous content
  sanitized = sanitizeText(sanitized);
  
  // Check length constraints
  if (sanitized.length === 0) {
    errors.push('SMS content cannot be empty');
  }
  
  if (sanitized.length > 1600) {
    errors.push('SMS content too long (max 1600 characters)');
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /data:text\/html/i,
    /vbscript:/i,
    /on\w+\s*=/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      errors.push('SMS content contains potentially unsafe content');
      break;
    }
  }
  
  return {
    sanitized,
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize user input for database storage
 */
export function sanitizeUserInput(input: string, maxLength = 1000): {
  sanitized: string;
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'string') {
    return { sanitized: '', isValid: true, errors: [] };
  }
  
  let sanitized = input.trim();
  
  // Basic sanitization
  sanitized = sanitizeText(sanitized);
  
  // Length validation
  if (sanitized.length > maxLength) {
    errors.push(`Input too long (max ${maxLength} characters)`);
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return {
    sanitized,
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Rate limiting key sanitization
 */
export function sanitizeRateLimitKey(input: string): string {
  if (!input) return 'anonymous';
  
  // Only allow alphanumeric characters, dots, and hyphens
  return input.replace(/[^a-zA-Z0-9.-]/g, '').substring(0, 100);
}