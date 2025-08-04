// lib/actions/messages.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendSMSWithFallback } from '@/lib/services/infobip-sms'
import { validateAndNormalize } from '@/lib/actions/swe-format'
import { Database } from '@/database.types'
import { sanitizePhoneNumber } from '@/lib/utils/sanitize';
import { validateSMSContent, validateHealthcareSMS } from '@/lib/utils/enhanced-sms-validator';
import { logger } from '@/lib/utils/logger';
// import { checkAtomicSMSRateLimit } from '@/lib/utils/atomic-rate-limiter';

// Define types for messages with optional sender_display_name for backwards compatibility
type Message = Omit<Database['public']['Tables']['messages']['Row'], 'sender_display_name'> & {
  sender_display_name?: string
}
type MessageWithPatient = Message & {
  patients: {
    cnumber: string
  } | null
}

/**
 * Sends a single SMS message to a recipient with proper validation
 *
 * @param content The content of the message
 * @param recipientPhone The phone number of the recipient
 * @param patientCnumber The cnumber of the patient (optional)
 * @returns A promise that resolves to an object with success status and optional error message
 */
// Fixed sendSingleSMS server action
export async function sendSingleSMS(
  content: string,
  recipientPhone: string,
  patientCnumber?: string
): Promise<{
success: boolean;
messageId?: string;
error?: string;
}> {
try {
  logger.sms('Request', { content, phone: recipientPhone, patientCnumber });

  // Enhanced SMS content validation
  const contentValidation = validateSMSContent(content);
  if (!contentValidation.isValid) {
    logger.security('Invalid SMS content detected', { 
      metadata: { 
        errors: contentValidation.errors,
        warnings: contentValidation.warnings
      } 
    });
    throw new Error(contentValidation.errors.join(', '));
  }
  
  // Healthcare compliance check for medical context
  const healthcareValidation = validateHealthcareSMS(content);
  if (!healthcareValidation.isCompliant) {
    logger.security('Healthcare SMS compliance violation', {
      metadata: { violations: healthcareValidation.violations }
    });
    throw new Error('SMS innehåller känslig medicinsk information: ' + healthcareValidation.violations.join(', '));
  }
  
  // Log warnings for monitoring
  if (contentValidation.warnings.length > 0) {
    logger.warn('SMS validation warnings', {
      metadata: { 
        warnings: contentValidation.warnings,
        segments: contentValidation.metadata.segments,
        cost: contentValidation.metadata.estimatedCost
      }
    });
  }
  
  const sanitizedContent = contentValidation.sanitized;

  const sanitizedPhone = sanitizePhoneNumber(recipientPhone);

  // Validate phone number
  const phoneValidation = validateAndNormalize(sanitizedPhone)
  if (!phoneValidation.isValid) {
    throw new Error(phoneValidation.error || 'Ogiltigt telefonnummer')
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Användaren är inte autentiserad')
  }


  // Rate limiting temporarily disabled - re-enable after database migration is complete
  // const rateLimitResult = await checkAtomicSMSRateLimit(user.id);
  // if (!rateLimitResult.allowed) {
  //   const waitTime = rateLimitResult.retryAfter || 60;
  //   logger.security('SMS rate limit exceeded', { 
  //     userId: user.id, 
  //     metadata: { 
  //       remaining: rateLimitResult.remaining, 
  //       resetTime: rateLimitResult.resetTime 
  //     } 
  //   });
  //   throw new Error(`För många SMS-förfrågningar. Försök igen om ${waitTime} sekunder.`);
  // }

  // Get user from public.users table
  const { data: dbUser, error: dbUserError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (dbUserError || !dbUser) {
    throw new Error('Användarprofil hittades inte');
  }

  const normalizedPhone = phoneValidation.normalized!;
  const senderTag = dbUser.username;
  logger.debug('Validation passed', { metadata: { normalizedPhone, senderTag } });

  // Send SMS using your service
  logger.sms('Sending', { phone: normalizedPhone });
  const result = await sendSMSWithFallback({
    content: sanitizedContent,
    recipientPhone: normalizedPhone,
    patientCnumber: patientCnumber || normalizedPhone,
    senderId: user.id,
    senderEmail: user.email
  });

  // Note: sendSMSWithFallback already saves to database
  // No need to save again here

  if (!result.success) {
    logger.error('SMS sending failed', new Error(result.error || 'Unknown error'), { metadata: { messageId: result.messageId } });
    throw new Error(result.error || 'Kunde inte skicka SMS')
  }

  logger.sms('Sent successfully', { messageId: result.messageId });

  // Update patient last contact time if real patient
  if (patientCnumber && patientCnumber.startsWith('C')) {
    try {
      await supabase
        .from('patients')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('cnumber', patientCnumber);
    } catch (updateError) {
      logger.warn('Could not update patient last contact', { metadata: { error: updateError, patientCnumber } });
      // Don't fail SMS if patient update fails
    }
  }

  // Revalidate paths
  try {
    revalidatePath('/sms')
    revalidatePath('/hem')
    if (patientCnumber) {
      revalidatePath(`/patients/${patientCnumber}`)
    }
  } catch (revalidateError) {
    logger.warn('Revalidation error', { metadata: { error: revalidateError } });
  }

  return {
    success: true,
    messageId: result.messageId
  }

} catch (error: unknown) {
  logger.error('SMS Action Error', error as Error);
  return {
    success: false,
    error: (error as Error)?.message || 'Ett oväntat fel inträffade'
  }
}
}

/**
 * Gets messages for a specific patient
 *
 * @param patientCnumber The cnumber of the patient
 * @returns A promise that resolves to an object with success status, messages, and optional error message
 */
export async function getPatientMessages(patientCnumber: string): Promise<{
  success: boolean;
  messages?: Message[];
  error?: string;
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Användaren är inte autentiserad')
    }

    // Get messages for the patient, ordered by created_at descending
    const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_cnumber', patientCnumber)
        .order('created_at', { ascending: false })

    if (messagesError) {
      throw messagesError
    }

    return {
      success: true,
      messages: messages || []
    }
  } catch (error) {
    logger.error('Error getting patient messages', error as Error, { metadata: { patientCnumber } });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ett okänt fel inträffade'
    }
  }
}

/**
 * Gets recent messages for the current user only (for /sms page)
 *
 * @param limit The maximum number of messages to return
 * @returns A promise that resolves to an object with success status, messages, and optional error message
 */
export async function getUserRecentMessages(limit: number = 10): Promise<{
  success: boolean;
  messages?: MessageWithPatient[];
  error?: string;
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Användaren är inte autentiserad')
    }

    const senderTag = user.email?.split('@')[0]?.toUpperCase()

    // Get recent messages for this user only, ordered by created_at descending
    // Use sender_id as primary method since it's more reliable
    let { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*, patients(cnumber)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    // If no messages found by sender_id, try by sender_tag as fallback
    if (!messages || messages.length === 0) {
      logger.debug('No messages found by sender_id, trying sender_tag', { userId: user.id, metadata: { senderTag } });
      const { data: messagesByTag, error: messagesByTagError } = await supabase
          .from('messages')
          .select('*, patients(cnumber)')
          .eq('sender_tag', senderTag ?? '')
          .order('created_at', { ascending: false })
          .limit(limit)

      if (!messagesByTagError && messagesByTag) {
        messages = messagesByTag;
        messagesError = null;
      }
    }

    if (messagesError) {
      throw messagesError
    }

    return {
      success: true,
      messages: messages || []
    }
  } catch (error) {
    logger.error('Error getting user recent messages', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ett okänt fel inträffade'
    }
  }
}

/**
 * Gets all recent messages across all users (for /hem page)
 *
 * @param limit The maximum number of messages to return
 * @returns A promise that resolves to an object with success status, messages, and optional error message
 */
export async function getAllRecentMessages(limit: number = 20): Promise<{
  success: boolean;
  messages?: MessageWithPatient[];
  error?: string;
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Användaren är inte autentiserad')
    }

    // Get recent messages from all users, ordered by created_at descending
    const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*, patients(cnumber)')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (messagesError) {
      throw messagesError
    }

    return {
      success: true,
      messages: messages || []
    }
  } catch (error) {
    logger.error('Error getting all recent messages', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ett okänt fel inträffade'
    }
  }
}

/**
 * Gets message statistics for dashboard
 */
export async function getMessageStats(): Promise<{
  success: boolean;
  stats?: {
    totalToday: number;
    totalThisWeek: number;
    totalThisMonth: number;
    successRate: number;
    userTotalToday: number;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Användaren är inte autentiserad')
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const senderTag = user.email?.split('@')[0]?.toUpperCase()

    // Get all stats in parallel
    const [todayResult, weekResult, monthResult, successResult, userTodayResult] = await Promise.all([
      // Total today (all users)
      supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .gte('created_at', today.toISOString()),

      // Total this week (all users)
      supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .gte('created_at', weekAgo.toISOString()),

      // Total this month (all users)
      supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .gte('created_at', monthAgo.toISOString()),

      // Success rate calculation
      supabase
          .from('messages')
          .select('status')
          .gte('created_at', weekAgo.toISOString()),

      // User total today
      supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('sender_tag', senderTag ?? '')
          .gte('created_at', today.toISOString())
    ])

    // Calculate success rate
    let successRate = 0
    if (successResult.data && successResult.data.length > 0) {
      const successful = successResult.data.filter(m => m.status === 'sent' || m.status === 'delivered').length
      successRate = (successful / successResult.data.length) * 100
    }

    return {
      success: true,
      stats: {
        totalToday: todayResult.count || 0,
        totalThisWeek: weekResult.count || 0,
        totalThisMonth: monthResult.count || 0,
        successRate: Math.round(successRate),
        userTotalToday: userTodayResult.count || 0
      }
    }
  } catch (error) {
    logger.error('Error getting message stats', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ett okänt fel inträffade'
    }
  }
}