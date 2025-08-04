// lib/actions/swe-format.ts
/**
 * Phone Number Utils – Swedish Format
 *
 * Clean. Consistent. Bulletproof.
 */

/**
 * Convert any garbage input into the holy +46 format.
 *
 * Examples:
 *  - "0701 44 70 85" → "+46701447085"
 *  - "+46701447085"  → "+46701447085"
 *  - "701234567"     → "+46701234567"
 *
 * @param raw Phone number input
 * @returns Standardized +46XXXXXXXXX or null if shit's invalid
 */
export function toInternationalFormat(raw: string): string | null {
    if (!raw) return null;

    const digits = raw.replace(/[^0-9+]/g, '');

    if (digits.startsWith('+46') && digits.length === 12) return digits;
    if (digits.startsWith('46') && digits.length === 11) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+46${digits.slice(1)}`;
    if (digits.length === 9) return `+46${digits}`;
    if (raw.startsWith('+46') && raw.replace(/\D/g, '').length === 11) {
        return `+46${raw.replace(/\D/g, '').slice(2)}`;
    }

    return null;
}

/**
 * Convert a phone number to national Swedish format (starts with 0)
 *
 * Examples:
 *  - "+46701234567" → "0701234567"
 *  - "46701234567"  → "0701234567"
 *  - "701234567"    → "0701234567"
 *
 * @param raw Phone number input
 * @returns 0XXXXXXXXX or null if invalid
 */
export function toNationalFormat(raw: string): string | null {
    if (!raw) return null;

    let digits = raw.replace(/\D/g, '');

    if (digits.startsWith('46') && digits.length === 11) return `0${digits.slice(2)}`;
    if (digits.startsWith('0') && digits.length === 10) return digits;
    if (digits.length === 9) return `0${digits}`;
    if (raw.startsWith('+46') && raw.replace(/\D/g, '').length === 11) {
        digits = raw.replace(/\D/g, '');
        return `0${digits.slice(2)}`;
    }

    return null;
}

/**
 * Check if number is valid Swedish international format
 *
 * @param phoneNumber The number to validate
 * @returns true if it's a legit +46XXXXXXXXX
 */
export function isValidSE(phoneNumber: string): boolean {
    return /^\+46\d{9}$/.test(phoneNumber);
}

/**
 * Format phone number for display (adds spaces for readability)
 *
 * Examples:
 *  - "+46701234567" → "+46 70 123 45 67"
 *  - "0701234567" → "070 123 45 67"
 *
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number string
 */
export function formatForDisplay(phoneNumber: string): string {
    if (!phoneNumber) return '';

    const international = toInternationalFormat(phoneNumber);
    if (international) {
        // Format as +46 XX XXX XX XX
        const digits = international.slice(3); // Remove +46
        return `+46 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
    }

    const national = toNationalFormat(phoneNumber);
    if (national) {
        // Format as 0XX XXX XX XX
        return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 8)} ${national.slice(8)}`;
    }

    return phoneNumber; // Return as-is if can't format
}

/**
 * Validate and normalize phone number input
 *
 * @param input Raw phone number input
 * @returns Object with validation result and normalized number
 */
export function validateAndNormalize(input: string): {
    isValid: boolean;
    normalized: string | null;
    displayFormat: string | null;
    error?: string;
} {
    if (!input || input.trim().length === 0) {
        return {
            isValid: false,
            normalized: null,
            displayFormat: null,
            error: 'Telefonnummer krävs'
        };
    }

    const normalized = toInternationalFormat(input.trim());

    if (!normalized) {
        return {
            isValid: false,
            normalized: null,
            displayFormat: null,
            error: 'Ogiltigt svenskt telefonnummer'
        };
    }

    return {
        isValid: true,
        normalized,
        displayFormat: formatForDisplay(normalized),
        error: undefined
    };
}