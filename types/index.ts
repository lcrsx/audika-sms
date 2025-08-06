/**
 * ============================================
 * COMPREHENSIVE TYPE DEFINITIONS
 * ============================================
 * This file contains all TypeScript type definitions used throughout the Audika SMS application.
 * Types are organized by domain and include comprehensive JSDoc documentation.
 * 
 * @fileoverview Complete type definitions for Audika SMS system
 * @version 1.0.0
 * @author Audika Development Team
 */

// ============================================
// BASE UTILITY TYPES
// ============================================

/**
 * Represents a standard database entity with common fields
 */
export interface BaseEntity {
  /** Unique identifier for the entity */
  id: string;
  /** Timestamp when the entity was created */
  created_at: string;
  /** Timestamp when the entity was last updated */
  updated_at: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  /** Whether the operation was successful */
  success: boolean;
  /** Response data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Additional error details */
  errorCode?: string;
  /** Human-readable message */
  message?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
  /** Number of items per page (max 100) */
  limit?: number;
  /** Number of items to skip */
  offset?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Total number of items available */
  total: number;
  /** Current page parameters */
  pagination: {
    limit: number;
    offset: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ============================================
// USER MANAGEMENT TYPES
// ============================================

/**
 * User role in the system
 */
export type UserRole = 'admin' | 'user' | 'viewer';

/**
 * User profile visibility setting
 */
export type ProfileVisibility = 'public' | 'private';

/**
 * Complete user profile information
 */
export interface User extends BaseEntity {
  /** Unique username (case-insensitive) */
  username: string;
  /** User's email address */
  email: string;
  /** Display name for UI */
  display_name?: string;
  /** User biography/description */
  bio?: string;
  /** Avatar image URL */
  avatar_url?: string;
  /** User's role in the system */
  role: UserRole;
  /** Whether the user account is active */
  is_active: boolean;
  /** Profile visibility setting */
  profile_visibility: ProfileVisibility;
  /** Dark mode preference */
  dark_mode: boolean;
  /** Email notifications preference */
  email_notifications: boolean;
  /** Last sign-in timestamp */
  last_sign_in_at?: string;
}

/**
 * User search result (public information only)
 */
export interface UserSearchResult {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
  /** Whether this is the current user's profile */
  is_own_profile: boolean;
}

/**
 * User settings for profile updates
 */
export interface UserSettings {
  display_name?: string;
  bio?: string;
  profile_visibility?: ProfileVisibility;
  dark_mode?: boolean;
  email_notifications?: boolean;
}

/**
 * User authentication context
 */
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  role?: UserRole;
  is_active?: boolean;
}

// ============================================
// PATIENT MANAGEMENT TYPES
// ============================================

/**
 * Patient gender options
 */
export type PatientGender = 'male' | 'female' | 'other';

/**
 * Patient phone number information
 */
export interface PatientPhone {
  /** Unique identifier */
  id: string;
  /** Phone number in E.164 format */
  phone: string;
  /** Human-readable label for the phone number */
  label: string;
  /** Associated patient ID */
  patient_id: string;
  /** Whether this is the primary phone number */
  is_primary?: boolean;
}

/**
 * Complete patient information with related data
 */
export interface Patient extends BaseEntity {
  /** Patient's unique identifier (C-number) */
  cnumber: string;
  /** Patient's city/location */
  city?: string;
  /** Date of birth */
  date_of_birth?: string;
  /** Patient's gender */
  gender?: PatientGender;
  /** Internal notes (staff only) */
  internal_notes?: string;
  /** Whether patient is active in system */
  is_active: boolean;
  /** VIP status for priority handling */
  is_vip: boolean;
  /** Last contact timestamp */
  last_contact_at?: string;
  /** User who created this patient record */
  created_by: string;
  /** Associated phone numbers */
  patient_phones: PatientPhone[];
  /** Computed: Total messages sent to patient */
  total_messages?: number;
  /** Computed: Status of last message */
  last_message_status?: MessageStatus;
  /** Computed: Content of last message */
  last_message_content?: string;
  /** Computed: Sender of last message */
  last_message_sender?: string;
  /** Computed: Timestamp of last message */
  last_message_at?: string;
}

/**
 * Patient creation/update form data
 */
export interface PatientFormData {
  cnumber: string;
  city?: string;
  date_of_birth?: string;
  gender?: PatientGender;
  internal_notes?: string;
  is_active?: boolean;
  is_vip?: boolean;
  phone_numbers: Array<{
    phone: string;
    label: string;
    is_primary?: boolean;
  }>;
}

/**
 * Patient statistics overview
 */
export interface PatientStats {
  /** Total number of patients */
  total: number;
  /** Number of active patients */
  active: number;
  /** Number of inactive patients */
  inactive: number;
  /** Number of VIP patients */
  vip: number;
  /** Patients created this month */
  created_this_month: number;
  /** Patients with recent contact */
  recently_contacted: number;
}

// ============================================
// MESSAGING SYSTEM TYPES
// ============================================

/**
 * SMS message status from delivery service
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

/**
 * Message template variable
 */
export interface MessageVariable {
  /** Variable name (e.g., 'patient_name') */
  name: string;
  /** Human-readable label */
  label: string;
  /** Default value if any */
  default_value?: string;
  /** Whether this variable is required */
  required: boolean;
}

/**
 * Reusable message template
 */
export interface MessageTemplate extends BaseEntity {
  /** Template name */
  name: string;
  /** Template content with variables */
  content: string;
  /** Template description */
  description?: string;
  /** Number of times template has been used */
  use_count: number;
  /** Template category tags */
  tags?: string[];
  /** Available variables in template */
  variables?: Record<string, MessageVariable>;
  /** Whether template is active */
  is_active: boolean;
  /** User who created template */
  created_by: string;
}

/**
 * SMS message record
 */
export interface Message extends BaseEntity {
  /** Message content */
  content: string;
  /** Current delivery status */
  status: MessageStatus;
  /** Patient identifier */
  patient_cnumber: string;
  /** Recipient phone number */
  recipient_phone: string;
  /** Sender's 4-character tag */
  sender_tag: string;
  /** Sender's display name */
  sender_display_name: string;
  /** ID of user who sent the message */
  sender_id: string;
  /** External message ID from SMS provider */
  infobip_message_id?: string;
  /** Template used (if any) */
  template_id?: string;
  /** Timestamp when message was sent */
  sent_at?: string;
  /** Timestamp when message was delivered */
  delivered_at?: string;
  /** Associated patient data */
  patients?: Patient | Patient[] | null;
  /** Associated template data */
  message_templates?: MessageTemplate | null;
}

/**
 * Parameters for sending SMS messages
 */
export interface SendSMSParams {
  /** Message content */
  content: string;
  /** Recipient phone number in E.164 format */
  recipientPhone: string;
  /** Patient identifier */
  patientCnumber: string;
  /** ID of user sending the message */
  senderId: string;
  /** Email of user sending (for tagging) */
  senderEmail?: string;
  /** Template ID if using template */
  templateId?: string;
  /** Template variables if using template */
  templateVariables?: Record<string, string>;
}

/**
 * SMS sending result
 */
export interface SMSResult {
  /** Whether sending was successful */
  success: boolean;
  /** External message ID (if successful) */
  messageId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Warning message (partial success) */
  warning?: string;
  /** Error code for debugging */
  errorCode?: string;
}

/**
 * Message history statistics
 */
export interface MessageStats {
  /** Total messages sent */
  totalMessages: number;
  /** Messages sent today */
  todayCount: number;
  /** Messages sent this week */
  thisWeekCount: number;
  /** Messages sent this month */
  thisMonthCount: number;
  /** Average message length in characters */
  averageMessageLength: number;
  /** Status breakdown */
  statusBreakdown: Record<MessageStatus, number>;
}

// ============================================
// DIRECT MESSAGING TYPES
// ============================================

/**
 * Direct message type
 */
export type DirectMessageType = 'direct' | 'system' | 'notification';

/**
 * Direct message between users
 */
export interface DirectMessage extends BaseEntity {
  /** User who sent the message */
  sender_id: string;
  /** User who receives the message */
  recipient_id: string;
  /** Message content */
  content: string;
  /** Message type */
  type: DirectMessageType;
  /** Whether recipient has read the message */
  is_read: boolean;
  /** Sender user information */
  sender?: User;
  /** Recipient user information */
  recipient?: User;
}

/**
 * Conversation preview information
 */
export interface ConversationPreview {
  /** ID of the other user in conversation */
  other_user_id: string;
  /** Other user's username */
  other_username: string;
  /** Other user's display name */
  other_display_name?: string;
  /** Content of last message */
  last_message_content: string;
  /** Timestamp of last message */
  last_message_at: string;
  /** Number of unread messages */
  unread_count: number;
  /** Whether current user sent the last message */
  is_sender: boolean;
}

// ============================================
// CHAT SYSTEM TYPES
// ============================================

/**
 * Real-time chat message
 */
export interface ChatMessage extends BaseEntity {
  /** Message content */
  content: string;
  /** Username of sender */
  username: string;
  /** Chat room name */
  room_name: string;
}

/**
 * Chat room information
 */
export interface ChatRoom {
  /** Room identifier */
  name: string;
  /** Room display name */
  display_name: string;
  /** Number of active participants */
  participant_count: number;
  /** Whether room is public */
  is_public: boolean;
  /** Room description */
  description?: string;
}

// ============================================
// RATE LIMITING TYPES
// ============================================

/**
 * Rate limit configuration
 */
export interface RateLimit {
  /** Unique rate limit key */
  key: string;
  /** Current request count */
  count: number;
  /** When the limit resets (Unix timestamp) */
  reset_time: number;
  /** When blocking expires (Unix timestamp) */
  blocked_until?: number;
}

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean;
  /** Remaining requests in window */
  remaining: number;
  /** When limit resets */
  reset_time: number;
  /** When blocking expires (if blocked) */
  blocked_until?: number;
}

// ============================================
// SYSTEM HEALTH TYPES
// ============================================

/**
 * Database connection pool statistics
 */
export interface ConnectionPoolStats {
  /** Total connections in pool */
  total: number;
  /** Currently active connections */
  active: number;
  /** Maximum allowed connections */
  maxConnections: number;
  /** Pool utilization percentage */
  utilization: number;
  /** Age of oldest connection (seconds) */
  oldestConnectionAge: number;
  /** Age of newest connection (seconds) */
  newestConnectionAge: number;
}

/**
 * System health check result
 */
export interface HealthCheck {
  /** Overall system status */
  status: 'healthy' | 'warning' | 'error';
  /** Check timestamp */
  timestamp: string;
  /** Database health information */
  database: {
    connectionPool: ConnectionPoolStats;
  };
  /** Additional health metrics */
  metrics?: Record<string, any>;
}

// ============================================
// FORM AND UI TYPES
// ============================================

/**
 * Form validation error
 */
export interface FormError {
  /** Field name that has error */
  field: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code?: string;
}

/**
 * Form submission state
 */
export interface FormState<T = any> {
  /** Form data */
  data: T;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Whether form has been submitted */
  isSubmitted: boolean;
  /** Form validation errors */
  errors: FormError[];
  /** Whether form is valid */
  isValid: boolean;
}

/**
 * Search filters for various entities
 */
export interface SearchFilters {
  /** Text search query */
  query?: string;
  /** Filter by status */
  status?: string;
  /** Filter by type */
  type?: string;
  /** Date range filter */
  dateRange?: {
    start: string;
    end: string;
  };
  /** Additional filters */
  [key: string]: any;
}

// ============================================
// ANALYTICS AND REPORTING TYPES
// ============================================

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  /** Timestamp */
  timestamp: string;
  /** Metric value */
  value: number;
  /** Additional labels */
  labels?: Record<string, string>;
}

/**
 * Usage analytics data
 */
export interface UsageAnalytics {
  /** Total messages sent */
  totalMessages: number;
  /** Active users count */
  activeUsers: number;
  /** Total patients */
  totalPatients: number;
  /** Time series data */
  timeSeries: TimeSeriesPoint[];
  /** Period this data covers */
  period: {
    start: string;
    end: string;
  };
}

// ============================================
// CONFIGURATION TYPES
// ============================================

/**
 * Application configuration
 */
export interface AppConfig {
  /** Maximum SMS length */
  maxSMSLength: number;
  /** Rate limiting configuration */
  rateLimits: {
    sms: {
      windowMs: number;
      maxRequests: number;
    };
    api: {
      windowMs: number;
      maxRequests: number;
    };
  };
  /** Feature flags */
  features: {
    directMessaging: boolean;
    vipPatients: boolean;
    messageTemplates: boolean;
    analytics: boolean;
  };
  /** UI configuration */
  ui: {
    defaultPageSize: number;
    maxPageSize: number;
    theme: 'light' | 'dark' | 'auto';
  };
}

// ============================================
// EXPORT ALL TYPES
// ============================================

export type {
  // Re-export commonly used types at top level
  User as AppUser,
  Patient as PatientData,
  Message as SMSMessage,
  DirectMessage as UserMessage,
  MessageTemplate as Template,
};

/**
 * Utility type to make all properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type to make all properties required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Utility type for database entities without timestamps
 */
export type WithoutTimestamps<T extends BaseEntity> = Omit<T, 'created_at' | 'updated_at'>;

/**
 * Utility type for entity creation (without id and timestamps)
 */
export type CreateEntity<T extends BaseEntity> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Utility type for entity updates (without id and created_at)
 */
export type UpdateEntity<T extends BaseEntity> = Partial<Omit<T, 'id' | 'created_at'>>;