/**
 * ==========================================
 * AUDIKA SMS - APPLICATION CONSTANTS
 * ==========================================
 * 
 * Comprehensive constants system with:
 * - Type-safe constant definitions
 * - Runtime configuration integration
 * - Validation rules and constraints
 * - UI/UX configuration values
 * - Business logic constants
 * - Internationalization support
 * - Performance thresholds
 * 
 * Architecture Philosophy:
 * - All magic numbers are defined here
 * - Type-safe access to all constants
 * - Integration with runtime configuration
 * - Self-documenting constant definitions
 * - Environment-aware constant values
 * 
 * @fileoverview Application constants and validation rules
 * @version 2.0.0
 * @author Audika Development Team
 */

// Simple constants - removing complex imports for now

// ==========================================
// CORE APPLICATION CONSTANTS
// ==========================================

/**
 * Primary application configuration constants
 * These values define core business logic and constraints
 */
export const APP_CONFIG = {
  // ==========================================
  // PAGINATION AND SEARCH LIMITS
  // ==========================================
  DEFAULT_SEARCH_LIMIT: 8,
  MAX_SEARCH_LIMIT: 100,
  DEFAULT_MESSAGE_LIMIT: 20,
  MAX_MESSAGE_LIMIT: 1000,
  PATIENT_SEARCH_MIN_LENGTH: 2,
  PATIENT_display_LIMIT: 10,
  USER_SEARCH_MIN_LENGTH: 2,
  USER_SEARCH_LIMIT: 20,
  
  // ==========================================
  // SMS AND MESSAGING CONSTRAINTS
  // ==========================================
  MAX_SMS_LENGTH: 1600, // Standard SMS concatenation limit
  MAX_SENDER_TAG_LENGTH: 4,
  MIN_SENDER_TAG_LENGTH: 2,
  // SMS simulation removed - production only uses real Infobip API
  MAX_TEMPLATE_VARIABLES: 20,
  MAX_TEMPLATE_NAME_LENGTH: 100,
  
  // ==========================================
  // PATIENT MANAGEMENT
  // ==========================================
  CNUMBER_PREFIX: 'C',
  CNUMBER_LENGTH: 10, // Including prefix
  MAX_PATIENT_PHONES: 5,
  PATIENT_PHONE_LABEL_MAX_LENGTH: 50,
  PATIENT_NOTES_MAX_LENGTH: 2000,
  VIP_PATIENT_PRIORITY_BOOST: 1000, // Priority score boost for VIP patients
  
  // ==========================================
  // USER MANAGEMENT
  // ==========================================
  MAX_BIO_LENGTH: 500,
  MAX_DISPLAY_NAME_LENGTH: 100,
  USERNAME_MIN_LENGTH: 2,
  USERNAME_MAX_LENGTH: 50,
  MAX_USER_SESSIONS: 5, // Maximum concurrent sessions per user
  
  // ==========================================
  // DIRECT MESSAGING
  // ==========================================
  MAX_DIRECT_MESSAGE_LENGTH: 1000,
  DIRECT_MESSAGE_HISTORY_LIMIT: 100,
  CONVERSATION_PREVIEW_LIMIT: 20,
  UNREAD_MESSAGE_BADGE_MAX: 99, // Show "99+" for counts above this
  
  // ==========================================
  // TIMING AND DELAYS
  // ==========================================
  SEARCH_DEBOUNCE_MS: 300,
  TYPING_INDICATOR_TIMEOUT_MS: 3000,
  ERROR_DISPLAY_TIMEOUT_MS: 5000,
  SUCCESS_DISPLAY_TIMEOUT_MS: 3000,
  LOADING_SPINNER_DELAY_MS: 200, // Delay before showing spinner
  AUTO_REFRESH_INTERVAL_MS: 30000, // 30 seconds
  REAL_TIME_RECONNECT_DELAY_MS: 1000,
  
  // ==========================================
  // UI/UX CONSTANTS
  // ==========================================
  OTP_LENGTH: 6,
  AVATAR_SIZES: {
    TINY: 24,
    SMALL: 32,
    MEDIUM: 40,
    LARGE: 64,
    XLARGE: 80,
    XXLARGE: 128,
  } as const,
  
  // Animation durations (in milliseconds)
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 800,
  } as const,
  
  // Breakpoints for responsive design
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    XXL: 1536,
  } as const,
  
  // ==========================================
  // DEFAULT VALUES
  // ==========================================
  DEFAULT_COUNTRY_CODE: '+46',
  DEFAULT_USER_ROLE: 'user' as const,
  DEFAULT_PROFILE_VISIBILITY: 'public' as const,
  DEFAULT_MESSAGE_STATUS: 'pending' as const,
  DEFAULT_PATIENT_GENDER: null,
  DEFAULT_THEME: 'light' as const,
  
  // ==========================================
  // FEATURE LIMITS
  // ==========================================
  MAX_MESSAGE_TEMPLATES_PER_USER: 50,
  MAX_PATIENT_TAGS: 10,
  MAX_BULK_OPERATIONS: 100, // Maximum items in bulk operations
  MAX_CONCURRENT_SMS: 10, // Maximum SMS sent simultaneously
  
  // ==========================================
  // CACHE CONFIGURATION
  // ==========================================
  CACHE_KEYS: {
    USER_PROFILE: 'user:profile:',
    PATIENT_DATA: 'patient:data:',
    MESSAGE_TEMPLATES: 'templates:user:',
    SYSTEM_HEALTH: 'system:health',
    FEATURE_FLAGS: 'features:flags',
  } as const,
  
  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
  } as const,
  
} as const;

// ==========================================
// USER INTERFACE MESSAGES
// ==========================================

/**
 * Comprehensive UI message definitions for consistent user experience
 * All user-facing messages are centralized here for easy localization
 */
export const UI_MESSAGES = {
  // ==========================================
  // ERROR MESSAGES
  // ==========================================
  ERRORS: {
    // Generic errors
    GENERIC: 'Ett oväntat fel inträffade',
    NETWORK: 'Nätverksfel - kontrollera din internetanslutning',
    TIMEOUT: 'Begäran tog för lång tid - försök igen',
    SERVER_ERROR: 'Serverfel - försök igen senare',
    
    // Authentication errors
    AUTH: 'Autentiseringsfel',
    AUTH_EXPIRED: 'Din session har gått ut - logga in igen',
    AUTH_INVALID: 'Ogiltiga inloggningsuppgifter',
    AUTH_BLOCKED: 'Ditt konto har blockerats',
    
    // Permission errors
    PERMISSION: 'Du har inte behörighet för denna åtgärd',
    PERMISSION_READ: 'Du har inte behörighet att läsa denna information',
    PERMISSION_WRITE: 'Du har inte behörighet att ändra denna information',
    PERMISSION_DELETE: 'Du har inte behörighet att radera denna information',
    
    // Validation errors
    VALIDATION: 'Ogiltiga uppgifter',
    VALIDATION_REQUIRED: 'Detta fält är obligatoriskt',
    VALIDATION_EMAIL: 'Ogiltig e-postadress',
    VALIDATION_PHONE: 'Ogiltigt telefonnummer',
    VALIDATION_LENGTH: 'Felaktig längd på texten',
    
    // Resource errors
    NOT_FOUND: 'Kunde inte hitta begärd resurs',
    PATIENT_NOT_FOUND: 'Patient kunde inte hittas',
    USER_NOT_FOUND: 'Användare kunde inte hittas',
    MESSAGE_NOT_FOUND: 'Meddelande kunde inte hittas',
    
    // SMS errors
    SMS_FAILED: 'SMS kunde inte skickas',
    SMS_INVALID_PHONE: 'Ogiltigt telefonnummer för SMS',
    SMS_RATE_LIMIT: 'För många SMS skickade - försök igen senare',
    SMS_CONTENT_TOO_LONG: 'Meddelandet är för långt',
    
    // Database errors
    DATABASE_ERROR: 'Databasfel - försök igen',
    CONNECTION_ERROR: 'Anslutningsfel - försök igen',
    
    // File upload errors
    FILE_TOO_LARGE: 'Filen är för stor',
    FILE_INVALID_TYPE: 'Filtypen stöds inte',
    UPLOAD_FAILED: 'Uppladdning misslyckades',
  } as const,
  
  // ==========================================
  // SUCCESS MESSAGES
  // ==========================================
  SUCCESS: {
    // Generic success
    SAVED: 'Sparad framgångsrikt',
    UPDATED: 'Uppdaterat framgångsrikt',
    DELETED: 'Raderat framgångsrikt',
    CREATED: 'Skapat framgångsrikt',
    
    // SMS success
    SMS_SENT: 'SMS skickat framgångsrikt',
    SMS_SCHEDULED: 'SMS schemalagt framgångsrikt',
    
    // Patient management
    PATIENT_CREATED: 'Patient skapad framgångsrikt',
    PATIENT_UPDATED: 'Patient uppdaterad framgångsrikt',
    PATIENT_VIP_PROMOTED: 'Patient upphöjd till VIP',
    PATIENT_VIP_DEMOTED: 'VIP-status borttagen från patient',
    
    // User management
    PROFILE_UPDATED: 'Profil uppdaterad framgångsrikt',
    PASSWORD_CHANGED: 'Lösenord ändrat framgångsrikt',
    
    // Messaging
    MESSAGE_SENT: 'Meddelande skickat framgångsrikt',
    MESSAGE_MARKED_READ: 'Meddelande markerat som läst',
    
    // Template management
    TEMPLATE_CREATED: 'Mall skapad framgångsrikt',
    TEMPLATE_SAVED: 'Mall sparad framgångsrikt',
    TEMPLATE_DELETED: 'Mall raderad framgångsrikt',
  } as const,
  
  // ==========================================
  // LOADING MESSAGES
  // ==========================================
  LOADING: {
    DEFAULT: 'Laddar...',
    SENDING: 'Skickar...',
    SAVING: 'Sparar...',
    SEARCHING: 'Söker...',
    UPLOADING: 'Laddar upp...',
    PROCESSING: 'Bearbetar...',
    CONNECTING: 'Ansluter...',
    AUTHENTICATING: 'Autentiserar...',
    
    // Specific loading messages
    LOADING_PATIENTS: 'Laddar patienter...',
    LOADING_MESSAGES: 'Laddar meddelanden...',
    LOADING_TEMPLATES: 'Laddar mallar...',
    LOADING_PROFILE: 'Laddar profil...',
    LOADING_CONVERSATION: 'Laddar konversation...',
  } as const,
  
  // ==========================================
  // CONFIRMATION MESSAGES
  // ==========================================
  CONFIRMATIONS: {
    DELETE: 'Är du säker på att du vill radera detta?',
    DELETE_PATIENT: 'Är du säker på att du vill radera denna patient?',
    DELETE_MESSAGE: 'Är du säker på att du vill radera detta meddelande?',
    DELETE_TEMPLATE: 'Är du säker på att du vill radera denna mall?',
    
    LOGOUT: 'Är du säker på att du vill logga ut?',
    LEAVE_PAGE: 'Är du säker på att du vill lämna denna sida? Osparade ändringar kommer att förloras.',
    
    BULK_DELETE: 'Är du säker på att du vill radera {count} objekt?',
    BULK_VIP_PROMOTE: 'Är du säker på att du vill upphöja {count} patienter till VIP?',
    BULK_VIP_DEMOTE: 'Är du säker på att du vill ta bort VIP-status från {count} patienter?',
  } as const,
  
  // ==========================================
  // PLACEHOLDER TEXT
  // ==========================================
  PLACEHOLDERS: {
    SEARCH: 'Sök...',
    SEARCH_PATIENTS: 'Sök patienter...',
    SEARCH_USERS: 'Sök användare...',
    SEARCH_MESSAGES: 'Sök meddelanden...',
    
    EMAIL: 'din@email.se',
    PHONE: '+46 70 123 45 67',
    NAME: 'Skriv namn...',
    MESSAGE: 'Skriv ditt meddelande...',
    BIO: 'Berätta något om dig själv...',
    
    PATIENT_CNUMBER: 'C1234567890',
    PATIENT_CITY: 'Stockholm',
    TEMPLATE_NAME: 'Mallnamn...',
  } as const,
  
  // ==========================================
  // STATUS LABELS
  // ==========================================
  STATUS: {
    ACTIVE: 'Aktiv',
    INACTIVE: 'Inaktiv',
    PENDING: 'Väntar',
    SENT: 'Skickat',
    DELIVERED: 'Levererat',
    FAILED: 'Misslyckades',
    
    ONLINE: 'Online',
    OFFLINE: 'Offline',
    AWAY: 'Frånvarande',
    BUSY: 'Upptagen',
    
    VIP: 'VIP',
    REGULAR: 'Vanlig',
    
    PUBLIC: 'Offentlig',
    PRIVATE: 'Privat',
  } as const,
} as const;

// ==========================================
// VALIDATION RULES
// ==========================================

/**
 * Comprehensive validation rules for all data types
 * Used by form validation and API validation
 */
export const VALIDATION_RULES = {
  // ==========================================
  // PHONE NUMBER VALIDATION
  // ==========================================
  PHONE: {
    MIN_LENGTH: 9,
    MAX_LENGTH: 15,
    SWEDISH_LENGTH: 10,
    SWEDISH_MOBILE_PREFIX: ['70', '72', '73', '76', '79'],
    INTERNATIONAL_PREFIX: '+',
    VALID_CHARS: /^[+\d\s\-()]+$/,
  } as const,
  
  // ==========================================
  // OTP VALIDATION
  // ==========================================
  OTP: {
    LENGTH: 6,
    NUMERIC_ONLY: true,
    VALID_CHARS: /^\d+$/,
    EXPIRY_MINUTES: 10,
  } as const,
  
  // ==========================================
  // TEXT FIELD VALIDATION
  // ==========================================
  BIO: {
    MAX_LENGTH: 500,
    MIN_LENGTH: 0,
  } as const,
  
  USERNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    VALID_CHARS: /^[a-zA-Z0-9_-]+$/,
    RESERVED_NAMES: ['admin', 'api', 'www', 'mail', 'ftp', 'test', 'dev'],
  } as const,
  
  DISPLAY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    VALID_CHARS: /^[\p{L}\p{N}\p{Zs}\p{P}]+$/u, // Unicode letters, numbers, spaces, punctuation
  } as const,
  
  // ==========================================
  // PASSWORD VALIDATION
  // ==========================================
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  } as const,
  
  // ==========================================
  // PATIENT VALIDATION
  // ==========================================
  PATIENT: {
    CNUMBER: {
      LENGTH: 10,
      PREFIX: 'C',
      VALID_CHARS: /^C\d{9}$/,
    },
    CITY: {
      MAX_LENGTH: 100,
      MIN_LENGTH: 1,
    },
    NOTES: {
      MAX_LENGTH: 2000,
    },
  } as const,
  
  // ==========================================
  // MESSAGE VALIDATION
  // ==========================================
  MESSAGE: {
    SMS: {
      MAX_LENGTH: 1600,
      MIN_LENGTH: 1,
    },
    DIRECT: {
      MAX_LENGTH: 1000,
      MIN_LENGTH: 1,
    },
    TEMPLATE: {
      NAME_MAX_LENGTH: 100,
      NAME_MIN_LENGTH: 1,
      DESCRIPTION_MAX_LENGTH: 500,
    },
  } as const,
  
  // ==========================================
  // FILE VALIDATION
  // ==========================================
  FILE: {
    AVATAR: {
      MAX_SIZE: 5 * 1024 * 1024, // 5MB
      ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
      MAX_DIMENSIONS: { width: 1024, height: 1024 },
    },
    DOCUMENT: {
      MAX_SIZE: 10 * 1024 * 1024, // 10MB
      ALLOWED_TYPES: ['application/pdf', 'application/msword', 'text/plain'],
    },
  } as const,
} as const;

// ==========================================
// BUSINESS LOGIC CONSTANTS
// ==========================================

/**
 * Business-specific constants and rules
 */
export const BUSINESS_RULES = {
  // ==========================================
  // SMS BUSINESS RULES
  // ==========================================
  SMS: {
    MAX_DAILY_PER_PATIENT: 5,
    MAX_HOURLY_PER_USER: 100,
    QUIET_HOURS: {
      START: 22, // 10 PM
      END: 8,    // 8 AM
    },
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: [1000, 5000, 15000], // Progressive delay
  } as const,
  
  // ==========================================
  // VIP PATIENT RULES
  // ==========================================
  VIP: {
    MAX_PERCENTAGE: 20, // Maximum 20% of patients can be VIP
    PRIORITY_BOOST: 1000,
    SPECIAL_HANDLING_DELAY_MS: 0, // No delay for VIP patients
    NOTIFICATION_CHANNELS: ['sms', 'email', 'push'],
  } as const,
  
  // ==========================================
  // USER ACTIVITY RULES
  // ==========================================
  ACTIVITY: {
    IDLE_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes
    SESSION_TIMEOUT_MS: 8 * 60 * 60 * 1000, // 8 hours
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  } as const,
  
  // ==========================================
  // DATA RETENTION RULES
  // ==========================================
  RETENTION: {
    MESSAGE_HISTORY_DAYS: 365, // 1 year
    USER_ACTIVITY_DAYS: 90,    // 3 months
    ERROR_LOGS_DAYS: 30,       // 1 month
    DELETED_RECORDS_DAYS: 7,   // 1 week in trash
  } as const,
} as const;

// ==========================================
// RUNTIME CONFIGURATION INTEGRATION
// ==========================================

/**
 * Gets runtime configuration values with fallbacks
 */
export function getRuntimeConfig() {
  // Production configuration - real services only
  return {
    smsProvider: 'infobip' as const,
    featuresEnabled: {
      vipPatients: true,
      directMessaging: true,
      messageTemplates: true,
      analytics: true,
      realTimeChat: true,
      apiDocs: process.env.NODE_ENV === 'development',
      debugRoutes: process.env.NODE_ENV === 'development',
    },
    rateLimits: {
      api: { windowMs: 60000, maxRequests: 100 },
      sms: { windowMs: 300000, maxRequests: 10 },
    },
    environment: process.env.NODE_ENV === 'production' ? 'production' as const : 'development' as const,
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

/**
 * Feature flag checker with fallback
 */
export function checkFeature(feature: string): boolean {
  // Simple feature checking - all features enabled by default
  console.debug('Checking feature:', feature);
  return true;
}

// ==========================================
// CONSTANT VALIDATORS
// ==========================================

/**
 * Validates that a string matches validation rules
 */
export function validateByRule(value: string, rule: keyof typeof VALIDATION_RULES): boolean {
  const rules = VALIDATION_RULES[rule];
  
  if ('MIN_LENGTH' in rules && value.length < rules.MIN_LENGTH) return false;
  if ('MAX_LENGTH' in rules && value.length > rules.MAX_LENGTH) return false;
  if ('VALID_CHARS' in rules && !rules.VALID_CHARS.test(value)) return false;
  if ('LENGTH' in rules && value.length !== rules.LENGTH) return false;
  
  return true;
}

/**
 * Gets validation error message for a rule
 */
export function getValidationError(rule: keyof typeof VALIDATION_RULES, value?: string): string {
  const rules = VALIDATION_RULES[rule];
  
  if ('LENGTH' in rules && value && value.length !== rules.LENGTH) {
    return `Must be exactly ${rules.LENGTH} characters`;
  }
  
  if ('MIN_LENGTH' in rules && 'MAX_LENGTH' in rules) {
    return `Must be between ${rules.MIN_LENGTH} and ${rules.MAX_LENGTH} characters`;
  }
  
  if ('VALID_CHARS' in rules) {
    return 'Contains invalid characters';
  }
  
  return 'Invalid format';
}

// ==========================================
// EXPORTS
// ==========================================

// Default export for convenience
const constants = {
  APP_CONFIG,
  UI_MESSAGES,
  VALIDATION_RULES,
  BUSINESS_RULES,
  getRuntimeConfig,
  checkFeature,
  validateByRule,
  getValidationError,
};

export default constants;