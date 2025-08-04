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

// Fixed simulated SMS with correct database fields
export async function sendSMSSimulated(params: SendSMSParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const {
    content,
    recipientPhone,
    patientCnumber,
    senderId,
    senderEmail
  } = params;

  // Ensure sender_tag is exactly 4 characters as required by schema
  const senderTag = (senderEmail?.split('@')[0]?.toUpperCase().slice(0, 4).padEnd(4, 'X')) || 'USER';
  const senderDisplayName = senderEmail?.split('@')[0]?.toUpperCase() || 'USER';

  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate 95% success rate
    const simulatedSuccess = Math.random() > 0.05;

    if (!simulatedSuccess) {
      return {
        success: false,
        error: 'Simulerad SMS-fel för testning'
      };
    }

    // Generate fake message ID
    const fakeMessageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save to database with CORRECT field names
    try {
      const supabase = await createClient();
      
      // Prepare message data with EXACT field names from schema
      const messageData = {
        sender_id: senderId,                    // uuid - matches schema
        sender_tag: senderTag,                  // character varying (4 chars) - matches schema
        patient_cnumber: patientCnumber,        // text - matches schema
        recipient_phone: recipientPhone,        // text - matches schema
        content: content,                       // text - matches schema
        status: 'sent' as const,                // message_status enum - matches schema
        infobip_message_id: fakeMessageId,      // text - matches schema
        sender_display_name: senderDisplayName, // text - matches schema
        sent_at: new Date().toISOString(),      // timestamp - optional field
        created_at: new Date().toISOString()    // timestamp - has default
      };

      console.log('💾 [SIMULATED] Inserting message with data:', messageData);

      const { data: insertedMessage, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ [SIMULATED] DB insert error:', insertError);
        console.error('❌ [SIMULATED] Failed data:', messageData);
      } else {
        console.log('✅ [SIMULATED] Message saved to database:', insertedMessage.id);
      }

    } catch (dbError) {
      console.error('❌ [SIMULATED] Database exception:', dbError);
    }

    // Update patient if real cnumber
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
          console.error('[SIMULATED] Patient update error:', updateError);
        } else {
          console.log('✅ [SIMULATED] Patient updated successfully');
        }
      }
    } catch (updateError) {
      console.error('[SIMULATED] Patient update exception:', updateError);
    }

    console.log(`📱 [SIMULATED] SMS SENT:
      To: ${recipientPhone}
      Patient: ${patientCnumber}
      Content: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}
      Message ID: ${fakeMessageId}
    `);

    return {
      success: true,
      messageId: fakeMessageId
    };

  } catch (error: unknown) {
    console.error('[SIMULATED] SMS error:', error);
    return {
      success: false,
      error: (error as Error)?.message || 'Simuleringsfel'
    };
  }
}

/**
 * Check if we should use simulated SMS (for development)
 * Returns true if Infobip credentials are not properly configured
 */
export function shouldUseSimulation(): boolean {
  const hasApiKey = !!process.env.INFOBIP_API_KEY;
  const hasBaseUrl = !!process.env.INFOBIP_BASE_URL;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  console.log('🔧 SMS Configuration:', {
    hasApiKey,
    hasBaseUrl,
    isDevelopment,
    baseUrl: process.env.INFOBIP_BASE_URL ? 'Set' : 'Not set',
    apiKey: process.env.INFOBIP_API_KEY ? 'Set' : 'Not set'
  });
  
  // In production, only use simulation if credentials are missing
  return !hasApiKey || !hasBaseUrl;
}

/**
 * Main SMS sending function that automatically chooses between real and simulated
 * This is what your actions should call
 */
export async function sendSMSWithFallback(params: SendSMSParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (shouldUseSimulation()) {
    console.log('🧪 Using simulated SMS sending (development mode or missing credentials)');
    return sendSMSSimulated(params);
  } else {
    console.log('📡 Using real Infobip SMS API');
    return sendSMS(params);
  }
}