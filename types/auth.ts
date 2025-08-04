/**
 * Type definitions for authentication and user-related types
 */

/**
 * Interface for user settings stored in metadata
 */
export interface UserSettings {
  darkMode?: boolean;
  emailNotifications?: boolean;
  profileVisibility?: 'public' | 'private';
}

/**
 * Interface for user metadata stored in Supabase Auth
 */
export interface UserMetadata {
  bio?: string;
  display_name?: string;
  avatar_url?: string;
  settings?: UserSettings;
  [key: string]: string | number | boolean | object | null | undefined; // Allow for additional properties
}

/**
 * Helper functions to safely work with user metadata
 */

import { User } from '@supabase/supabase-js';

/**
 * Safely get the user metadata as our custom UserMetadata type
 */
export function getUserMetadataTyped(user: User): UserMetadata {
  return (user.user_metadata || {}) as UserMetadata;
}