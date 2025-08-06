/**
 * Infobip SMS Service - Production Ready
 *
 * This service provides functions to send SMS messages using the Infobip API.
 * It uses environment variables for configuration:
 * - INFOBIP_BASE_URL: The base URL for the Infobip API
 * - INFOBIP_API_KEY: The API key for authentication
 * - INFOBIP_SENDER_ID: The default sender ID to use
 */
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { handleSMSError, handleDatabaseError } from '@/lib/utils/error-handler';

export const mapInfobipStatusToInternal = (status: string): 'pending' | 'sent' | 'delivered' | 'failed' => {
  const normalized = status.toLowerCase();

  if (normalized.includes('pending')) return 'pending';
  if (normalized.includes('sent')) return 'sent';
  if (normalized.includes('delivered')) return 'delivered';
  if (normalized.includes('fail')) return 'failed';

  return 'sent'; // default fallback
};

// Define the return type for SMS operations
type SMSResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  warning?: string;
  errorCode?: string;
};

// Define the shape of the input params so TypeScript can help catch your dumb mistakes
type SendSMSParams = {
  content: string;             // Actual message body
  recipientPhone: string;      // Who the hell you're sending to (E.164 format: +46701234567)
  patientCnumber: string;      // Custom patient identifier (used in your DB)
  senderId: string;            // User ID from Supabase auth
  senderEmail?: string;        // used to tag who sent the message
};

// Expected response structure from Infobip's v3 API (see their docs)
type InfobipV3Response = {
  bulkId: string;
  messages: Array<{
    messageId: string;
    to: string;
    status: {
      groupId: number;
      groupName: string;
      id: number;
      name: string;
      description: string;
    };
  }>;
};

// Fixed SMS Service with correct database fields
export async function sendSMS(params: SendSMSParams): Promise<SMSResult> {
  const {
    content,
    recipientPhone,
    patientCnumber,
    senderId,
    senderEmail
  } = params;

  // Uppercase the sender tag for consistency (must be exactly 4 characters)
  const senderTag = (senderEmail?.split('@')[0]?.toUpperCase().slice(0, 4).padEnd(4, 'X')) || 'USER';
  const senderDisplayName = senderEmail?.split('@')[0]?.toUpperCase() || 'USER';

  try {
    // 🚀 Step 1: Send SMS using Infobip API v3
    const response = await fetch(
        `${process.env.INFOBIP_BASE_URL}/sms/3/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `App ${process.env.INFOBIP_API_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            messages: [
              {
                from: process.env.INFOBIP_SENDER_ID || 'Audika AB',
                destinations: [{ to: recipientPhone }],
                content: {
                  text: content
                }
              }
            ]
          })
        }
    );

    // Handle HTTP failure from Infobip
    if (!response.ok) {
      const errorText = await response.text();
      const secureError = handleSMSError(new Error(errorText), response.status);
      
      return {
        success: false,
        error: secureError.userMessage,
        errorCode: secureError.errorCode
      };
    }

    // Parse JSON response
    const data = (await response.json()) as InfobipV3Response;

    // Extract messageId from response
    const message = data.messages?.[0];
    if (!message || !message.messageId) {
      console.error('No message ID in Infobip response:', data);
      return {
        success: false,
        error: 'SMS skickades men ingen bekräftelse mottogs'
      };
    }

    // 🧾 Step 2: Save message to database with CORRECT field names
    try {
      const supabase = await createClient();
      
      // Prepare the message data with EXACT field names from schema
      const messageData = {
        sender_id: senderId,                    // uuid - matches schema
        sender_tag: senderTag,                  // character varying - matches schema  
        patient_cnumber: patientCnumber,        // text - matches schema
        recipient_phone: recipientPhone,        // text - matches schema
        content: content,                       // text - matches schema
        status: 'sent' as const,                // message_status enum - matches schema
        infobip_message_id: message.messageId,  // text - matches schema
        sender_display_name: senderDisplayName, // text - matches schema
        sent_at: new Date().toISOString(),      // timestamp - optional field
        created_at: new Date().toISOString()    // timestamp - has default but we set it
      };

      console.log('💾 Inserting message with data:', messageData);

      const { data: insertedMessage, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (insertError) {
        handleDatabaseError(insertError);
        logger.error('Database insert failed after SMS sent', insertError as Error, {
          metadata: { messageId: message.messageId }
        });
        
        // Return partial success - SMS sent but not saved
        return {
          success: true,
          messageId: message.messageId,
          warning: 'SMS skickat men kunde inte sparas i databasen'
        };
      } else {
        logger.info('Message saved to database', { metadata: { messageId: insertedMessage.id } });
      }

    } catch (dbError) {
      handleDatabaseError(dbError);
      logger.error('Database exception after SMS sent', dbError as Error);
      // Continue - SMS was sent successfully
    }

    // 🧠 Step 3: Update patient's last_contact_at
    try {
      if (patientCnumber && patientCnumber.startsWith('C')) {
        const supabase = await createClient();
        const { error: updateError } = await supabase
            .from('patients')
            .update({
              last_contact_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('cnumber', patientCnumber);

        if (updateError) {
          console.error('Patient update error:', updateError);
        } else {
          console.log('✅ Patient updated successfully');
        }
      }
    } catch (updateError) {
      console.error('Patient update exception:', updateError);
    }

    console.log(`📱 SMS SENT SUCCESSFULLY:
      To: ${recipientPhone}
      Patient: ${patientCnumber}
      Content: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}
      Message ID: ${message.messageId}
    `);

    return {
      success: true,
      messageId: message.messageId
    };

  } catch (error: unknown) {
    const secureError = handleSMSError(error);
    return {
      success: false,
      error: secureError.userMessage,
      errorCode: secureError.errorCode
    };
  }
}

/**
 * Main SMS sending function - PRODUCTION ONLY with real Infobip API
 * Requires proper Infobip credentials to be configured
 */
export async function sendSMSWithFallback(params: SendSMSParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  // Validate required Infobip credentials
  const hasApiKey = !!process.env.INFOBIP_API_KEY;
  const hasBaseUrl = !!process.env.INFOBIP_BASE_URL;
  
  if (!hasApiKey || !hasBaseUrl) {
    logger.error('Missing required Infobip credentials', new Error('SMS service not configured'));
    return {
      success: false,
      error: 'SMS-tjänsten är inte korrekt konfigurerad. Kontakta administratören.'
    };
  }

  logger.info('Using Infobip SMS API for real SMS sending');
  return sendSMS(params);
}