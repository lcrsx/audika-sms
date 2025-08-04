/**
 * Rate Limiting Utility
 * Prevents abuse of SMS and other critical endpoints
 */

import { sanitizeRateLimitKey } from './sanitize';

interface RateLimitRule {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in window
  blockDurationMs?: number; // How long to block after limit exceeded
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default rate limit rules
export const RATE_LIMIT_RULES = {
  SMS_SENDING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 SMS per minute per user
    blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
  },
  AUTH_ATTEMPTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  },
  SEARCH_REQUESTS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    blockDurationMs: 60 * 1000, // Block for 1 minute
  },
  PATIENT_CREATION: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 patients per 5 minutes
    blockDurationMs: 10 * 60 * 1000, // Block for 10 minutes
  },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if request should be allowed based on rate limiting
 */
export function checkRateLimit(
  key: string,
  rule: RateLimitRule,
  identifier?: string
): RateLimitResult {
  const now = Date.now();
  const sanitizedKey = sanitizeRateLimitKey(key);
  const fullKey = identifier ? `${sanitizedKey}:${sanitizeRateLimitKey(identifier)}` : sanitizedKey;
  
  // Clean up expired entries
  cleanupExpiredEntries();
  
  let entry = rateLimitStore.get(fullKey);
  
  // Check if currently blocked
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      limit: rule.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }
  
  // Initialize or reset if window expired
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + rule.windowMs,
    };
    rateLimitStore.set(fullKey, entry);
  }
  
  // Increment counter
  entry.count++;
  
  // Check if limit exceeded
  if (entry.count > rule.maxRequests) {
    // Set block duration if specified
    if (rule.blockDurationMs) {
      entry.blockedUntil = now + rule.blockDurationMs;
    }
    
    return {
      allowed: false,
      limit: rule.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  
  return {
    allowed: true,
    limit: rule.maxRequests,
    remaining: rule.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit for SMS sending
 */
export function checkSMSRateLimit(userId: string): RateLimitResult {
  return checkRateLimit('sms', RATE_LIMIT_RULES.SMS_SENDING, userId);
}

/**
 * Rate limit for authentication attempts
 */
export function checkAuthRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit('auth', RATE_LIMIT_RULES.AUTH_ATTEMPTS, identifier);
}

/**
 * Rate limit for search requests
 */
export function checkSearchRateLimit(userId?: string, ip?: string): RateLimitResult {
  const identifier = userId || ip || 'anonymous';
  return checkRateLimit('search', RATE_LIMIT_RULES.SEARCH_REQUESTS, identifier);
}

/**
 * Rate limit for patient creation
 */
export function checkPatientCreationRateLimit(userId: string): RateLimitResult {
  return checkRateLimit('patient_creation', RATE_LIMIT_RULES.PATIENT_CREATION, userId);
}

/**
 * Reset rate limit for a specific key (admin function)
 */
export function resetRateLimit(key: string, identifier?: string): void {
  const sanitizedKey = sanitizeRateLimitKey(key);
  const fullKey = identifier ? `${sanitizedKey}:${sanitizeRateLimitKey(identifier)}` : sanitizedKey;
  rateLimitStore.delete(fullKey);
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove if window expired and not blocked
    if (now >= entry.resetTime && (!entry.blockedUntil || now >= entry.blockedUntil)) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  key: string,
  rule: RateLimitRule,
  identifier?: string
): RateLimitResult {
  const now = Date.now();
  const sanitizedKey = sanitizeRateLimitKey(key);
  const fullKey = identifier ? `${sanitizedKey}:${sanitizeRateLimitKey(identifier)}` : sanitizedKey;
  
  const entry = rateLimitStore.get(fullKey);
  
  if (!entry || now >= entry.resetTime) {
    return {
      allowed: true,
      limit: rule.maxRequests,
      remaining: rule.maxRequests,
      resetTime: now + rule.windowMs,
    };
  }
  
  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      limit: rule.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }
  
  return {
    allowed: entry.count < rule.maxRequests,
    limit: rule.maxRequests,
    remaining: Math.max(0, rule.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

// Cleanup expired entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}