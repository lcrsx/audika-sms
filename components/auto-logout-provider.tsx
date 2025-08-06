'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAutoLogout, useSessionExpiry } from '@/lib/hooks/use-auto-logout';

interface AutoLogoutProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that handles automatic logout functionality
 * Only activates on authenticated pages
 */
export function AutoLogoutProvider({ children }: AutoLogoutProviderProps) {
  const pathname = usePathname();
  const [isAuthPage, setIsAuthPage] = useState(false);

  // Check if current page is an auth page
  useEffect(() => {
    const authPaths = ['/auth/login', '/auth/signup', '/auth/reset-password'];
    setIsAuthPage(authPaths.some(path => pathname.startsWith(path)));
  }, [pathname]);

  // Initialize auto-logout (only on non-auth pages)
  useAutoLogout({
    timeout: 2 * 60 * 60 * 1000, // 2 hours
    warningTime: 5 * 60 * 1000, // 5 minutes warning
    showWarnings: !isAuthPage, // Only show warnings on authenticated pages
    onLogout: () => {
      // Clear any cached data on logout
      if (typeof window !== 'undefined') {
        // Clear localStorage items related to user session
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('notifications-cleared-') || 
            key.startsWith('sms_drafts') ||
            key.startsWith('user-cache-')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage
        sessionStorage.clear();
      }
    }
  });

  // Initialize session expiry checking (always active)
  useSessionExpiry();

  return <>{children}</>;
}