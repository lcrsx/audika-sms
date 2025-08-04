'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Users, Mail, Video, Phone, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Separator } from './ui/separator';
import { generateCartoonAvatar } from '@/lib/avatar-utils';

const supabase = createClient();

// ===========================
// TYPES & INTERFACES
// ===========================

interface User {
  id: string;
  metadata: {
    username: string;
    displayName?: string;
    avatarUrl: string;
    role: string;
    lastActive: string;
  };
}

type PresenceData = {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
  lastActive?: string;
};

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Generates user initials from display name or username
 */
const getInitials = (username: string): string => {
  if (!username) return 'U';
  return username
      .split(/[^A-Za-z0-9]+/)
      .filter(word => word.length > 0)
      .map(word => word[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2);
};

/**
 * Computes human-readable time since last active
 */
const computeLastActive = (iso: string): string => {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  } catch {
    return '';
  }
};

// ✅ FIXED: Use only auth metadata - no database calls
interface FooterAuthUser {
  email?: string;
  user_metadata?: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    role?: string;
    [key: string]: unknown;
  };
}

const constructUserData = (authUser: FooterAuthUser) => {
  const emailBase = authUser.email?.split('@')[0]?.toUpperCase() || 'USER';
  const metadata = authUser.user_metadata || {};

  return {
    username: emailBase,
    displayName: metadata.display_name || '',
    avatarUrl: metadata.avatar_url || ''
  };
};

// ===========================
// COMPACT USER AVATAR COMPONENT
// ===========================

interface CompactUserAvatarProps {
  user: User;
  index: number;
  currentUserSession?: {
    id: string;
    email?: string;
    user_metadata?: {
      display_name?: string;
      role?: string;
      [key: string]: unknown;
    };
  } | null;
}

const CompactUserAvatar = ({ user, index, currentUserSession }: CompactUserAvatarProps) => {
  const { username, displayName, avatarUrl, lastActive } = user.metadata;
  const displayNameToShow = (displayName && displayName !== username) ? displayName : username;
  
  // Check if this is the current user
  const isCurrentUser = currentUserSession && 
    currentUserSession.email?.split('@')[0]?.toUpperCase() === username;
  
  // Use session data for current user's avatar, otherwise use presence data
  const avatarName = isCurrentUser ? 
    (currentUserSession.user_metadata?.display_name || username) :
    (displayName || username);

  return (
      <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ scale: 1.1 }}
          className="relative group"
      >
        <Link href={`/${username}`}>
          <Avatar className="h-8 w-8 ring-2 ring-white/40 dark:ring-slate-600/40 hover:ring-blue-400/60 transition-all duration-300 cursor-pointer">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayNameToShow} />
            ) : (
              <AvatarImage src={generateCartoonAvatar(avatarName)} alt={displayNameToShow} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-medium">
              {getInitials(displayNameToShow)}
            </AvatarFallback>
          </Avatar>

          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-800 animate-pulse" />
        </Link>

        {/* Hover tooltip */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap">
            {displayNameToShow} • {lastActive}
          </div>
        </div>
      </motion.div>
  );
};

// ===========================
// MAIN FOOTER COMPONENT
// ===========================

export function Footer() {
  // ===========================
  // STATE MANAGEMENT
  // ===========================

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserSession, setCurrentUserSession] = useState<{
    id: string;
    email?: string;
    user_metadata?: {
      display_name?: string;
      role?: string;
      [key: string]: unknown;
    };
  } | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  // ===========================
  // GET CURRENT USER SESSION
  // ===========================

  useEffect(() => {
    const getCurrentUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUserSession(session.user);
        }
      } catch (err) {
        console.error('Failed to get current user session:', err);
      }
    };

    getCurrentUserSession();

    // Listen for auth state changes to update immediately when user updates their avatar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setCurrentUserSession(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ===========================
  // PRESENCE MANAGEMENT
  // ===========================

  useEffect(() => {
    mountedRef.current = true;

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY) {
      setLoading(false);
      setError('Configuration error');
      return;
    }

    const supabase = createClient();

    // Create a stable presence key
    const getPresenceKey = () => {
      const stored = sessionStorage.getItem('presence_key');
      if (stored) return stored;

      const newKey = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('presence_key', newKey);
      return newKey;
    };

    const presenceKey = getPresenceKey();

    // Create channel with better configuration
    const channel = supabase
        .channel('footer-online-users', {
          config: {
            presence: {
              key: presenceKey
            }
          }
        })
        .on('presence', { event: 'sync' }, () => {
          if (!mountedRef.current) return;

          try {
            const state = channel.presenceState();
            const userList: User[] = [];
            const seenUsers = new Set<string>();

            // Process presence state and avoid duplicates
            Object.entries(state).forEach(([presenceId, presences]) => {
              const presence = presences[0] as PresenceData;
              if (presence && presence.username) {
                // Use username as unique identifier to prevent duplicates
                const uniqueKey = presence.username.toLowerCase();

                if (!seenUsers.has(uniqueKey)) {
                  seenUsers.add(uniqueKey);
                  userList.push({
                    id: presenceId,
                    metadata: {
                      username: presence.username,
                      displayName: presence.displayName,
                      avatarUrl: presence.avatarUrl || '',
                      role: presence.role || 'User',
                      lastActive: computeLastActive(presence.lastActive || new Date().toISOString())
                    }
                  });
                }
              }
            });

            // Sort by last active (most recent first)
            userList.sort((a, b) => {
              const aTime = a.metadata.lastActive === 'now' ? Date.now() :
                  new Date().getTime() - (parseInt(a.metadata.lastActive) || 0) * 60000;
              const bTime = b.metadata.lastActive === 'now' ? Date.now() :
                  new Date().getTime() - (parseInt(b.metadata.lastActive) || 0) * 60000;
              return bTime - aTime;
            });

            setUsers(userList);
            setError(null);
          } catch {
            // Error handled by setting error state
            setError('Failed to load users');
          } finally {
            setLoading(false);
          }
        });
    // ✅ REMOVED: All console.log statements from presence events

    channelRef.current = channel;

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && mountedRef.current) {
        try {
          const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

          if (authError || !currentUser) {
            setError('Authentication required');
            setCurrentUser(null);
            setLoading(false);
            return;
          }

          // Set current user
          if (mountedRef.current) {
            setCurrentUser({
              id: currentUser.id,
              metadata: {
                username: 'Loading...',
                avatarUrl: '',
                role: 'User',
                lastActive: 'now'
              }
            });
          }

          // ✅ FIXED: Use only auth metadata - no database calls
          const userData = constructUserData(currentUser);
          const emailBase = currentUser.email?.split('@')[0]?.toUpperCase() || 'USER';

          // Track presence with current timestamp
          await channel.track({
            username: emailBase, // ← Always use email prefix UPPERCASE for URLs
            displayName: userData.displayName,
            avatarUrl: userData.avatarUrl || '',
            role: currentUser.user_metadata?.role || 'User',
            lastActive: new Date().toISOString(),
          });

        } catch {
          // Error handled by setting error and loading state
          if (mountedRef.current) {
            setError('Failed to connect');
            setLoading(false);
          }
        }
      }
    });

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // ===========================
  // RENDER CONDITIONS
  // ===========================

  // Don't render footer if user is not authenticated
  if (!currentUser && !loading) {
    return (
      <footer className="mx-4 mb-4 mt-8 z-30 relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">
        <div className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
          Footer: Not authenticated
        </div>
      </footer>
    );
  }

  // ===========================
  // SUPPORT LINKS DATA
  // ===========================

  const supportLinks = [
    {
      href: "mailto:helpdesk@audika.se",
      icon: Mail,
      text: "helpdesk@audika.se",
      label: "Email Support"
    },
    {
      href: "https://teams.microsoft.com/l/chat/0/0?users=ltou@demant.com",
      icon: Video,
      text: "Leffe",
      label: "Teams LTOU"
    },
    {
      href: "https://teams.microsoft.com/l/chat/0/0?users=svkt@demant.com",
      icon: Video,
      text: "Savvas",
      label: "Teams SVKT"
    },
    {
      href: "tel:+46841037010",
      icon: Phone,
      text: "08 410 370 10",
      label: "Phone Support"
    }
  ];

  // ===========================
  // RENDER COMPONENT
  // ===========================

  return (
      <footer className="mx-4 mb-4 mt-8 z-30 relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">

        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-800/50 rounded-2xl" />

        <div className="relative z-10 px-6 py-4">

          {/* ===========================
            COMPACT ONLINE USERS SECTION
            =========================== */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Online
              </span>
                <Badge className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  {users.length}
                </Badge>
              </div>
            </div>

            {/* Users Display */}
            <div className="min-h-[40px] flex items-center">
              <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center space-x-2"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </motion.div>
                ) : error ? (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm text-red-600 dark:text-red-400"
                    >
                      {error}
                    </motion.div>
                ) : users.length === 0 ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm text-gray-500 dark:text-gray-400"
                    >
                      No users online
                    </motion.div>
                ) : (
                    <motion.div
                        key="users"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center space-x-2 flex-wrap gap-2"
                    >
                      {users.slice(0, 12).map((user, index) => (
                          <CompactUserAvatar key={user.id} user={user} index={index} currentUserSession={currentUserSession} />
                      ))}
                      {users.length > 12 && (
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
                            +{users.length - 12}
                          </div>
                      )}
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <Separator className="my-4 bg-gray-200/50 dark:bg-gray-700/50" />

          {/* ===========================
            FOOTER CONTENT
            =========================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">

            {/* Company Info */}
            <div className="text-center md:text-left">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                Audika AB
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                &copy; {new Date().getFullYear()} All rights reserved
              </div>
            </div>

            {/* Attribution */}
            <div className="text-center">
              <div className="flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
                <span>Built with</span>
                <Heart className="h-3 w-3 mx-1 text-red-500" />
                <span>by Lucere Studios</span>
              </div>
            </div>

            {/* Support Links */}
            <div className="text-center md:text-right">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Support
              </div>
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                {supportLinks.map(({ href, icon: Icon, text, label }) => (
                    <Link
                        key={href}
                        href={href}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100/50 dark:bg-gray-700/50 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 text-xs text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group"
                        title={label}
                        target={href.startsWith('http') ? "_blank" : undefined}
                        rel={href.startsWith('http') ? "noopener noreferrer" : undefined}
                    >
                      <Icon className="h-3 w-3 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-medium">{text}</span>
                    </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
  );
}