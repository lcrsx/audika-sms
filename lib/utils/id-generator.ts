/**
 * Secure ID Generation Utilities
 * Generates cryptographically secure, unpredictable IDs
 */

import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure patient ID
 * Format: C + timestamp + random + checksum
 */
export function generateSecurePatientId(phoneNumber?: string): string {
  // Use timestamp for ordering but not predictability
  const timestamp = Date.now().toString(36).toUpperCase();
  
  // Generate random component
  const randomComponent = randomBytes(4).toString('hex').toUpperCase();
  
  // Optional phone-based component (hashed, not direct)
  let phoneComponent = '';
  if (phoneNumber) {
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    // Use a simple hash rather than direct digits
    const hash = phoneDigits.split('').reduce((acc, digit) => 
      acc + parseInt(digit), 0) % 100;
    phoneComponent = hash.toString().padStart(2, '0');
  }
  
  // Combine components
  const baseId = `C${timestamp}${randomComponent}${phoneComponent}`;
  
  // Add checksum for validation
  const checksum = calculateChecksum(baseId);
  
  return `${baseId}${checksum}`;
}

/**
 * Generate a secure message ID
 */
export function generateSecureMessageId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(6).toString('hex').toUpperCase();
  return `MSG${timestamp}${random}`;
}

/**
 * Generate a secure session ID
 */
export function generateSecureSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Calculate a simple checksum for ID validation
 */
function calculateChecksum(input: string): string {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i);
  }
  return (sum % 100).toString().padStart(2, '0');
}

/**
 * Validate a patient ID format
 */
export function validatePatientId(id: string): boolean {
  // Must start with C and be at least 10 characters
  if (!id.startsWith('C') || id.length < 10) {
    return false;
  }
  
  // Extract checksum and base
  const base = id.slice(0, -2);
  const checksum = id.slice(-2);
  
  // Validate checksum
  return calculateChecksum(base) === checksum;
}

/**
 * Generate a secure but readable reference number
 * Format: YYYYMMDD-XXXX (date + random)
 */
export function generateReferenceNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = randomBytes(2).toString('hex').toUpperCase();
  return `${dateStr}-${random}`;
}

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate a secure temporary token
 */
export function generateTempToken(expirationMinutes = 60): {
  token: string;
  expiresAt: Date;
} {
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  
  return { token, expiresAt };
}