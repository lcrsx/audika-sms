// Application configuration constants
export const APP_CONFIG = {
  // Pagination and limits
  DEFAULT_SEARCH_LIMIT: 8,
  DEFAULT_MESSAGE_LIMIT: 20,
  PATIENT_SEARCH_MIN_LENGTH: 2,
  PATIENT_DISPLAY_LIMIT: 10,
  
  // Phone number formatting
  MAX_SENDER_TAG_LENGTH: 4,
  
  // SMS simulation
  SMS_SIMULATION_SUCCESS_RATE: 0.95, // 95% success rate
  
  // Timeouts and delays
  SEARCH_DEBOUNCE_MS: 300,
  TYPING_INDICATOR_TIMEOUT_MS: 3000,
  ERROR_DISPLAY_TIMEOUT_MS: 5000,
  
  // UI constants
  OTP_LENGTH: 6,
  MAX_BIO_LENGTH: 500,
  AVATAR_SIZES: {
    SMALL: 32,
    MEDIUM: 40,
    LARGE: 64,
    XLARGE: 80
  },
  
  // Default values
  DEFAULT_COUNTRY_CODE: '+46',
  DEFAULT_USER_ROLE: 'user',
} as const;

export const UI_MESSAGES = {
  ERRORS: {
    GENERIC: 'Ett oväntat fel inträffade',
    NETWORK: 'Nätverksfel - kontrollera din internetanslutning',
    AUTH: 'Autentiseringsfel',
    PERMISSION: 'Du har inte behörighet för denna åtgärd',
    VALIDATION: 'Ogiltiga uppgifter',
    NOT_FOUND: 'Kunde inte hitta begärd resurs'
  },
  SUCCESS: {
    SAVED: 'Sparad framgångsrikt',
    SENT: 'Skickat framgångsrikt',
    UPDATED: 'Uppdaterat framgångsrikt',
    DELETED: 'Raderat framgångsrikt'
  },
  LOADING: {
    DEFAULT: 'Laddar...',
    SENDING: 'Skickar...',
    SAVING: 'Sparar...',
    SEARCHING: 'Söker...'
  }
} as const;

export const VALIDATION_RULES = {
  PHONE: {
    MIN_LENGTH: 9,
    MAX_LENGTH: 15,
    SWEDISH_LENGTH: 10
  },
  OTP: {
    LENGTH: 6,
    NUMERIC_ONLY: true
  },
  BIO: {
    MAX_LENGTH: 500
  },
  USERNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  }
} as const;