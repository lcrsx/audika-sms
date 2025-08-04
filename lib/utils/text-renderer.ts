/**
 * Secure Text Rendering Utilities
 * Prevents XSS attacks while allowing safe text formatting
 */

/**
 * Sanitizes text content for safe rendering
 * Removes HTML tags and potentially dangerous content
 */
export function sanitizeTextForDisplay(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove HTML tags
  const withoutHtml = text.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous content
  const withoutScripts = withoutHtml
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // Normalize whitespace
  return withoutScripts.trim();
}

/**
 * Escapes HTML entities in text
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char);
}

/**
 * Truncates text safely while preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): {
  truncated: string;
  isTruncated: boolean;
} {
  const sanitized = sanitizeTextForDisplay(text);
  
  if (sanitized.length <= maxLength) {
    return {
      truncated: sanitized,
      isTruncated: false
    };
  }

  // Find the last space before the max length
  const truncated = sanitized.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  const finalText = lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated.substring(0, maxLength - 3) + '...';

  return {
    truncated: finalText,
    isTruncated: true
  };
}

/**
 * Formats SMS content for display with line breaks
 */
export function formatSMSContent(content: string): string {
  const sanitized = sanitizeTextForDisplay(content);
  
  // Preserve line breaks by converting them to <br> tags
  // But first escape HTML, then convert \n to <br>
  const escaped = escapeHtml(sanitized);
  return escaped.replace(/\n/g, '<br>');
}

/**
 * Validates that text content is safe for display
 */
export function validateTextContent(content: string): {
  isValid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      errors: ['Content must be a string']
    };
  }

  // Check for potentially malicious patterns
  const dangerousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /data:\s*text\/html/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
    /<embed[\s\S]*?>/gi,
    /<form[\s\S]*?>[\s\S]*?<\/form>/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      errors.push('Content contains potentially dangerous elements');
      break;
    }
  }

  const sanitized = sanitizeTextForDisplay(content);

  // Check length after sanitization
  if (sanitized.length > 5000) {
    errors.push('Content too long (max 5000 characters)');
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * React component safe text renderer
 */
export interface SafeTextProps {
  content: string;
  className?: string;
  maxLength?: number;
  preserveLineBreaks?: boolean;
}

/**
 * Creates safe text content for React rendering
 */
export function createSafeTextContent(content: string, preserveLineBreaks = false): string {
  const validation = validateTextContent(content);
  
  if (!validation.isValid) {
    console.warn('Invalid text content detected:', validation.errors);
    return 'Invalid content';
  }

  if (preserveLineBreaks) {
    return formatSMSContent(validation.sanitized);
  }

  return validation.sanitized;
}