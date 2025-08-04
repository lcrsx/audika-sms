/**
 * User Input Validation and Sanitization
 * Prevents mass assignment and validates user data
 */

import { sanitizeText } from './sanitize';

// Interface for user creation data structure (used internally)
export interface CreateUserData {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  role?: 'user' | 'admin';
  is_active?: boolean;
}

interface ValidatedUserData {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: 'user';
  is_active: true;
}

/**
 * Validates and sanitizes user creation data
 * Prevents mass assignment vulnerabilities
 */
export function validateUserCreationData(
  userId: string,
  userEmail: string | undefined,
  username: string,
  userMetadata?: Record<string, unknown>
): {
  isValid: boolean;
  data?: ValidatedUserData;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate user ID (should be UUID from auth)
  if (!userId || typeof userId !== 'string') {
    errors.push('Invalid user ID');
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    errors.push('User ID must be a valid UUID');
  }

  // Validate email
  if (!userEmail || typeof userEmail !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      errors.push('Invalid email format');
    }
  }

  // Validate username
  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
  } else {
    const sanitizedUsername = sanitizeText(username);
    if (sanitizedUsername.length < 2 || sanitizedUsername.length > 50) {
      errors.push('Username must be between 2 and 50 characters');
    }
    
    // Only allow alphanumeric and basic punctuation
    if (!/^[a-zA-Z0-9._-]+$/.test(sanitizedUsername)) {
      errors.push('Username contains invalid characters');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Create validated data object with only allowed fields
  const sanitizedUsername = sanitizeText(username);
  let displayName = sanitizedUsername;
  
  // Safely extract display name from metadata
  if (userMetadata && typeof userMetadata === 'object' && userMetadata.display_name) {
    const metaDisplayName = sanitizeText(String(userMetadata.display_name));
    if (metaDisplayName.length > 0 && metaDisplayName.length <= 100) {
      displayName = metaDisplayName;
    }
  }

  const validatedData: ValidatedUserData = {
    id: userId,
    email: userEmail!.toLowerCase().trim(),
    username: sanitizedUsername,
    display_name: displayName,
    role: 'user', // Force role to 'user' - never allow elevation
    is_active: true // Force active status
  };

  return {
    isValid: true,
    data: validatedData,
    errors: []
  };
}

/**
 * Validates username for uniqueness and format
 */
export function validateUsername(username: string): {
  isValid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!username || typeof username !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      errors: ['Username is required']
    };
  }

  const sanitized = sanitizeText(username.trim().toLowerCase());

  // Length validation
  if (sanitized.length < 2) {
    errors.push('Username must be at least 2 characters');
  }
  
  if (sanitized.length > 50) {
    errors.push('Username must be no more than 50 characters');
  }

  // Format validation
  if (!/^[a-zA-Z0-9._-]+$/.test(sanitized)) {
    errors.push('Username can only contain letters, numbers, dots, underscores, and hyphens');
  }

  // Reserved usernames
  const reserved = ['admin', 'root', 'system', 'test', 'null', 'undefined', 'api', 'www'];
  if (reserved.includes(sanitized)) {
    errors.push('Username is reserved');
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Sanitizes user metadata to prevent injection
 */
export function sanitizeUserMetadata(metadata: unknown): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  if (!metadata || typeof metadata !== 'object') {
    return sanitized;
  }

  // Only allow specific safe fields
  const allowedFields = ['display_name', 'first_name', 'last_name'];
  
  for (const field of allowedFields) {
    const metadataObj = metadata as Record<string, unknown>;
    if (metadataObj[field] && typeof metadataObj[field] === 'string') {
      const value = sanitizeText(metadataObj[field] as string);
      if (value.length > 0 && value.length <= 100) {
        sanitized[field] = value;
      }
    }
  }

  return sanitized;
}