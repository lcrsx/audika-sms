'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

/**
 * Creates a Supabase client for server-side operations.
 * Only use in Server Components or Server Actions.
 */
export async function createClient() {
  const cookieStore = await cookies() // This is synchronous in Next 14+, but doc says await in some places—adjust as needed.

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // cookieStore.set(name, value, options) // This only works in Server Actions!
              // In middleware, you'd need a NextResponse. Here, just try/catch.
              cookieStore.set(name, value, options)
            })
          } catch {
            // Can fail in Server Components—ignore, as per official docs
          }
        },
      },
    }
  )
}
