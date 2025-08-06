'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

/**
 * Configuration for auto-logout functionality
 */
interface AutoLogoutConfig {
  /** Timeout in milliseconds (default: 2 hours) */
  timeout?: number;
  /** Warning time before logout in milliseconds (default: 5 minutes) */
  warningTime?: number;
  /** Whether to show warning notifications */
  showWarnings?: boolean;
  /** Callback when user is logged out */
  onLogout?: () => void;
}

/**
 * Hook for automatic user logout after inactivity
 * Tracks user activity and logs out after specified timeout
 */
export function useAutoLogout(config: AutoLogoutConfig = {}) {
  const {
    timeout = 2 * 60 * 60 * 1000, // 2 hours
    warningTime = 5 * 60 * 1000, // 5 minutes
    showWarnings = true,
    onLogout
  } = config;

  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  // Reset activity timer
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timeout
    if (showWarnings && warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          const remainingMinutes = Math.ceil(warningTime / (60 * 1000));
          
          toast.warning('Inaktivitetsvarning', {
            description: `Du kommer att loggas ut automatiskt om ${remainingMinutes} minuter på grund av inaktivitet. Klicka var som helst för att fortsätta.`,
            duration: warningTime,
            action: {
              label: 'Fortsätt sessionen',
              onClick: () => {
                resetActivity();
                toast.success('Session förlängd');
              }
            }
          });
        }
      }, timeout - warningTime);
    }

    // Set logout timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        const supabase = createClient();
        
        // Sign out user
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Error during auto-logout:', error);
        }

        // Show logout notification
        toast.error('Automatisk utloggning', {
          description: 'Du har loggats ut automatiskt på grund av inaktivitet.',
          duration: 6000
        });

        // Call custom logout callback
        if (onLogout) {
          onLogout();
        }

        // Redirect to login
        router.push('/auth/login');

      } catch (error) {
        console.error('Error during auto-logout:', error);
        // Force redirect even if logout fails
        router.push('/auth/login');
      }
    }, timeout);
  }, [timeout, warningTime, showWarnings, router, onLogout]);

  // Activity event handlers
  const handleActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset if enough time has passed to avoid excessive resets
    if (timeSinceLastActivity > 10000) { // 10 seconds
      resetActivity();
    }
  }, [resetActivity]);

  // Set up activity listeners
  useEffect(() => {
    // List of events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize activity timer
    resetActivity();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [handleActivity, resetActivity]);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        // Clear timeouts when user signs out
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
        }
      } else if (event === 'SIGNED_IN') {
        // Reset activity when user signs in
        resetActivity();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resetActivity]);

  // Return functions for manual control
  return {
    resetActivity,
    getRemainingTime: () => {
      const elapsed = Date.now() - lastActivityRef.current;
      return Math.max(0, timeout - elapsed);
    },
    isWarningActive: () => warningShownRef.current
  };
}

/**
 * Hook for checking if session is expired based on token
 */
export function useSessionExpiry() {
  const router = useRouter();

  const checkSession = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Session is invalid or expired
        toast.error('Session utgången', {
          description: 'Din session har gått ut. Du omdirigeras till inloggningssidan.',
          duration: 4000
        });
        
        router.push('/auth/login');
        return false;
      }

      // Check if token is close to expiry (within 5 minutes)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiresAtMs = expiresAt * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAtMs - now;
        
        if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
          // Try to refresh the session
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
            toast.warning('Session snart utgången', {
              description: 'Din session går snart ut. Spara ditt arbete.',
              duration: 10000
            });
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  }, [router]);

  // Check session periodically
  useEffect(() => {
    // Initial check
    checkSession();

    // Check every 10 minutes
    const interval = setInterval(checkSession, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkSession]);

  return { checkSession };
}