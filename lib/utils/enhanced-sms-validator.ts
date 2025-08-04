/**
 * Enhanced SMS Content Validation
 * Comprehensive security and carrier-specific validation
 */

import { logger } from './logger';

interface SMSValidationResult {
  isValid: boolean;
  sanitized: string;
  errors: string[];
  warnings: string[];
  metadata: {
    length: number;
    segments: number;
    encoding: 'GSM7' | 'UCS2';
    estimatedCost: number;
    carrier_warnings: string[];
  };
}

// GSM 7-bit character set
const GSM7_CHARS = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "{}\\[~]|€";

// Prohibited content patterns for SMS
const PROHIBITED_PATTERNS = [
  // Security threats
  /javascript:/gi,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /data:\s*text\/html/gi,
  /vbscript:/gi,
  
  // SMS injection attacks
  /\+CMGS/gi,
  /\+CMGF/gi,
  /AT\+/gi,
  
  // Premium number patterns (Sweden)
  /\b(0900|0939|077[2-9]|020\s*7[2-9])\b/g,
  
  // Spam indicators
  /STOP\s+to\s+opt-out/gi,
  /Reply\s+STOP/gi,
  /Text\s+STOP/gi,
  
  // Phishing patterns
  /click\s+here\s+now/gi,
  /urgent\s+action\s+required/gi,
  /verify\s+your\s+account/gi,
  /suspended\s+account/gi,
];

// Suspicious content patterns (warnings, not errors)
const SUSPICIOUS_PATTERNS = [
  /free\s+money/gi,
  /guaranteed\s+winner/gi,
  /act\s+now/gi,
  /limited\s+time\s+offer/gi,
  /call\s+now/gi,
  /\$\d+\s+guaranteed/gi,
];

// Medical terms that require special handling
const MEDICAL_TERMS = [
  'prescription', 'medication', 'surgery', 'diagnosis', 'treatment',
  'symptoms', 'doctor', 'hospital', 'emergency', 'urgent medical'
];

/**
 * Enhanced SMS content validation with security and carrier compliance
 */
export function validateSMSContent(content: string): SMSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const carrier_warnings: string[] = [];

  // Basic validation
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      errors: ['SMS content is required'],
      warnings: [],
      metadata: {
        length: 0,
        segments: 0,
        encoding: 'GSM7',
        estimatedCost: 0,
        carrier_warnings: []
      }
    };
  }

  let sanitized = content.trim();
  
  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Length validation
  if (sanitized.length === 0) {
    errors.push('SMS content cannot be empty after sanitization');
  }
  
  if (sanitized.length > 4096) {
    errors.push('SMS content too long (max 4096 characters)');
  }

  // Security validation - check for prohibited patterns
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(sanitized)) {
      errors.push('SMS content contains prohibited content');
      logger.security('Prohibited SMS content detected', { 
        metadata: { pattern: pattern.toString(), content: sanitized.substring(0, 100) } 
      });
      break;
    }
  }

  // Suspicious content warnings
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      warnings.push('SMS content may appear as spam to recipients');
      break;
    }
  }

  // Medical content validation
  const containsMedicalTerms = MEDICAL_TERMS.some(term => 
    sanitized.toLowerCase().includes(term.toLowerCase())
  );
  
  if (containsMedicalTerms) {
    warnings.push('SMS contains medical terms - ensure compliance with healthcare regulations');
  }

  // Character encoding detection
  const encoding = detectEncoding(sanitized);
  const segments = calculateSegments(sanitized, encoding);
  
  // Segment warnings
  if (segments > 1) {
    carrier_warnings.push(`Message will be sent as ${segments} parts`);
  }
  
  if (segments > 6) {
    errors.push('Message too long - maximum 6 SMS segments allowed');
  }

  // Cost estimation (simplified)
  const estimatedCost = segments * 0.50; // SEK per segment
  
  if (estimatedCost > 3.00) {
    warnings.push(`High cost message (estimated ${estimatedCost.toFixed(2)} SEK)`);
  }

  // URL validation
  const urls = extractURLs(sanitized);
  if (urls.length > 0) {
    for (const url of urls) {
      if (!isValidURL(url)) {
        errors.push('SMS contains invalid or suspicious URLs');
        break;
      }
    }
    
    if (urls.length > 2) {
      warnings.push('Multiple URLs may trigger spam filters');
    }
  }

  // Phone number validation in content
  const phoneNumbers = extractPhoneNumbers(sanitized);
  if (phoneNumbers.length > 3) {
    warnings.push('Multiple phone numbers may trigger spam filters');
  }

  // Special character warnings for encoding
  if (encoding === 'UCS2') {
    carrier_warnings.push('Message contains special characters - reduced character limit');
  }

  // Final sanitization - remove any remaining problematic characters
  sanitized = sanitized.replace(/[\uFEFF\u200B-\u200D\u2060]/g, ''); // Remove zero-width characters
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
    warnings,
    metadata: {
      length: sanitized.length,
      segments,
      encoding,
      estimatedCost,
      carrier_warnings
    }
  };
}

/**
 * Detect SMS encoding (GSM7 or UCS2)
 */
function detectEncoding(text: string): 'GSM7' | 'UCS2' {
  const gsmChars = GSM7_CHARS + GSM7_EXTENDED;
  
  for (const char of text) {
    if (!gsmChars.includes(char)) {
      return 'UCS2';
    }
  }
  
  return 'GSM7';
}

/**
 * Calculate SMS segments based on content and encoding
 */
function calculateSegments(text: string, encoding: 'GSM7' | 'UCS2'): number {
  let charCount = 0;
  
  if (encoding === 'GSM7') {
    // Count extended characters as 2 chars
    for (const char of text) {
      if (GSM7_EXTENDED.includes(char)) {
        charCount += 2;
      } else {
        charCount += 1;
      }
    }
    
    // GSM7: 160 chars single, 153 chars multi-part
    if (charCount <= 160) return 1;
    return Math.ceil(charCount / 153);
  } else {
    // UCS2: 70 chars single, 67 chars multi-part
    charCount = text.length;
    if (charCount <= 70) return 1;
    return Math.ceil(charCount / 67);
  }
}

/**
 * Extract URLs from SMS content
 */
function extractURLs(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
  return text.match(urlRegex) || [];
}

/**
 * Validate URL safety
 */
function isValidURL(url: string): boolean {
  try {
    // Add protocol if missing
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    
    // Block suspicious TLDs
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.bit', '.onion'];
    if (suspiciousTLDs.some(tld => urlObj.hostname.endsWith(tld))) {
      return false;
    }
    
    // Block IP addresses
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(urlObj.hostname)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract phone numbers from SMS content
 */
function extractPhoneNumbers(text: string): string[] {
  const phoneRegex = /(?:\+46|0)[0-9\s-]{8,}/g;
  return text.match(phoneRegex) || [];
}

/**
 * Validate SMS for healthcare compliance (Swedish healthcare context)
 */
export function validateHealthcareSMS(content: string): {
  isCompliant: boolean;
  violations: string[];
  recommendations: string[];
} {
  const violations: string[] = [];
  const recommendations: string[] = [];
  
  // Check for personal data
  const personalDataPatterns = [
    /\b\d{12}\b/g, // Swedish personal numbers
    /\b\d{6}-\d{4}\b/g, // Personal number format
    /journal\s*nummer/gi,
    /patient\s*id/gi,
  ];
  
  for (const pattern of personalDataPatterns) {
    if (pattern.test(content)) {
      violations.push('SMS may contain personal identification numbers');
      break;
    }
  }
  
  // Check for medical diagnosis
  if (/diagnosis|diagnos/gi.test(content)) {
    recommendations.push('Avoid including specific diagnoses in SMS');
  }
  
  // Check for medication details
  if (/medicin|medicine|pills|tablets/gi.test(content)) {
    recommendations.push('Consider general medication reminders instead of specific drugs');
  }
  
  return {
    isCompliant: violations.length === 0,
    violations,
    recommendations
  };
}

/**
 * Real-time SMS validation for user input
 */
export function validateSMSInput(content: string): {
  isValid: boolean;
  message: string;
  characterCount: number;
  segmentCount: number;
  encoding: string;
} {
  const validation = validateSMSContent(content);
  
  let message = '';
  if (!validation.isValid) {
    message = validation.errors[0];
  } else if (validation.warnings.length > 0) {
    message = validation.warnings[0];
  } else {
    message = 'SMS is valid';
  }
  
  return {
    isValid: validation.isValid,
    message,
    characterCount: validation.metadata.length,
    segmentCount: validation.metadata.segments,
    encoding: validation.metadata.encoding
  };
}