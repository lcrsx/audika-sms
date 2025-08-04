/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid
 */

interface RequiredEnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY: string;
  INFOBIP_BASE_URL: string;
  INFOBIP_API_KEY: string;
  INFOBIP_SENDER_ID: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

interface OptionalEnvVars {
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DATABASE_URL?: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
}

const requiredEnvVars: (keyof RequiredEnvVars)[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY',
  'INFOBIP_BASE_URL',
  'INFOBIP_API_KEY',
  'INFOBIP_SENDER_ID',
  'NODE_ENV'
];

export function validateEnvironmentVariables(): RequiredEnvVars & OptionalEnvVars {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value) {
      missing.push(envVar);
    } else {
      // Additional validation for specific variables
      switch (envVar) {
        case 'NEXT_PUBLIC_SUPABASE_URL':
          if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
            invalid.push(`${envVar}: Must be a valid Supabase URL`);
          }
          break;
        case 'INFOBIP_BASE_URL':
          if (!value.startsWith('https://') || !value.includes('infobip.com')) {
            invalid.push(`${envVar}: Must be a valid Infobip API URL`);
          }
          break;
        case 'INFOBIP_API_KEY':
          if (value.length < 32 || !value.includes('-')) {
            invalid.push(`${envVar}: Must be a valid Infobip API key`);
          }
          // Check for placeholder values
          if (value === 'your_infobip_api_key_here' || value.includes('placeholder')) {
            invalid.push(`${envVar}: Contains placeholder value, not real API key`);
          }
          break;
        case 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY':
          if (value === 'your_supabase_anon_key_here' || value.includes('placeholder')) {
            invalid.push(`${envVar}: Contains placeholder value, not real key`);
          }
          break;
        case 'NODE_ENV':
          if (!['development', 'production', 'test'].includes(value)) {
            invalid.push(`${envVar}: Must be development, production, or test`);
          }
          break;
      }
    }
  }

  // Production-specific validation
  if (process.env.NODE_ENV === 'production') {
    // Additional checks for production
    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')) {
      invalid.push('NEXT_PUBLIC_SUPABASE_URL: Cannot use localhost in production');
    }
  }

  // Report errors
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`  - ${envVar}`));
  }

  if (invalid.length > 0) {
    console.error('❌ Invalid environment variables:');
    invalid.forEach(error => console.error(`  - ${error}`));
  }

  if (missing.length > 0 || invalid.length > 0) {
    console.error('\n📋 Setup Instructions:');
    console.error('1. Copy .env.example to .env');
    console.error('2. Fill in all required values with real credentials');
    console.error('3. Restart the application');
    
    throw new Error(`Environment validation failed. Missing: ${missing.length}, Invalid: ${invalid.length}`);
  }

  console.log('✅ Environment variables validated successfully');
  
  return process.env as unknown as RequiredEnvVars & OptionalEnvVars;
}

// Validate on module load in non-test environments
if (process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
  try {
    validateEnvironmentVariables();
  } catch (error) {
    // Log but don't crash during build
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Environment validation failed during build:', error);
    }
  }
}