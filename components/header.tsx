'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
    Menu,
    X,
    Search,
    Bell,
    Home,
    MessageSquare,
    Shield,
    LogOut,
    MessageSquareMore,
    Sparkles,
    Users,
    ArrowRight,
    Loader2,
    Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { generateCartoonAvatar } from '@/lib/avatar-utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from './ui/badge';

// ===========================
// TYPES & INTERFACES
// ===========================

interface AppUser {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    role?: string;
    bio?: string;
}

interface NavigationItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    protected?: boolean;
}

interface ChatNotification {
    id: string;
    content: string;
    username: string;
    room_name: string;
    created_at: string;
    is_dm: boolean;
}

interface SearchResult {
    id: string;
    type: 'patient' | 'message' | 'user';
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    metadata?: {
        status?: string;
        last_contact?: string;
        total_messages?: number;
        [key: string]: unknown;
    };
}

// ===========================
// CONFIGURATION
// ===========================

const navigationItems: NavigationItem[] = [
    { href: '/hem', label: 'Hem', icon: Home, protected: true },
    { href: '/sms', label: 'SMS', icon: MessageSquare, protected: true },
    { href: '/patients', label: 'Patients', icon: Shield, protected: true },
    { href: '/historik', label: 'Historik', icon: Clock, protected: true },
    { href: '/users', label: 'Användare', icon: Users, protected: true },
    { href: '/chat', label: 'Chat', icon: MessageSquareMore, protected: true },
];

// ===========================
// UTILITIES
// ===========================

const getInitials = (name: string): string => {
    if (!name) return 'U';
    return name
        .split(/\s+/)
        .map(w => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2) || 'U';
};

interface AuthUser {
    id: string;
    email?: string;
    user_metadata?: {
        display_name?: string;
        role?: string;
        [key: string]: unknown;
    };
}

const constructUserData = (authUser: AuthUser) => {
    const emailBase = authUser.email?.split('@')[0]?.toUpperCase() || 'USER';
    const metadata = authUser.user_metadata || {};

    return {
        id: authUser.id,
        email: authUser.email || '',
        username: emailBase,
        displayName: String(metadata.display_name || ''),
        avatarUrl: String(metadata.avatar_url || ''),
        role: String(metadata.role || 'User'),
        bio: String(metadata.bio || '')
    };
};

// ===========================
// COMPONENT
// ===========================

export function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [authInit, setAuthInit] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentMessages, setRecentMessages] = useState<ChatNotification[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    
    // Refs for click-away functionality
    const searchRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Scroll shadow
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Click-away functionality for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Close search dropdown if clicking outside
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
            }
            
            // Close notification dropdown if clicking outside
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };

        // Add event listener when dropdowns are open
        if (showSearch || showNotifications) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Cleanup event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSearch, showNotifications]);

    // Global search functionality
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim() || !user) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const supabase = createClient();
            const results: SearchResult[] = [];

            // Search patients
            const { data: patients } = await supabase
                .from('patients')
                .select('*')
                .or(`cnumber.ilike.%${query.replace(/[%_\\]/g, '\\$&')}%,city.ilike.%${query.replace(/[%_\\]/g, '\\$&')}%`)
                .limit(5);

            patients?.forEach(patient => {
                results.push({
                    id: patient.id,
                    type: 'patient',
                    title: patient.cnumber,
                    subtitle: patient.city || 'Ingen stad',
                    icon: Users,
                    href: `/patients?search=${encodeURIComponent(patient.cnumber)}`,
                    metadata: patient
                });
            });

            // Search chat messages
            const { data: messages } = await supabase
                .from('chat')
                .select('*')
                .or(`content.ilike.%${query}%,username.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(5);

            messages?.forEach(message => {
                results.push({
                    id: message.id,
                    type: 'message',
                    title: message.username,
                    subtitle: message.content.length > 50 
                        ? message.content.substring(0, 50) + '...' 
                        : message.content,
                    icon: MessageSquare,
                    href: message.room_name === 'global' ? '/chat' : `/chat?dm=${message.username}`,
                    metadata: message
                });
            });

            // Enhanced user search
            // Search users from multiple sources
            const userResults: { username: string; source: string; activity?: number }[] = [];
            
            // 1. Search users from chat messages
            const { data: chatUsers } = await supabase
                .from('chat')
                .select('username')
                .ilike('username', `%${query}%`)
                .limit(10);

            chatUsers?.forEach(u => {
                if (u.username && !userResults.find(r => r.username === u.username)) {
                    userResults.push({ username: u.username, source: 'chat' });
                }
            });

            // 2. Search users from SMS messages
            const { data: smsUsers } = await supabase
                .from('messages')
                .select('sender_tag')
                .ilike('sender_tag', `%${query}%`)
                .not('sender_tag', 'is', null)
                .limit(10);

            smsUsers?.forEach(u => {
                if (u.sender_tag && !userResults.find(r => r.username === u.sender_tag)) {
                    userResults.push({ username: u.sender_tag, source: 'sms' });
                }
            });

            // 3. Get message counts for each user
            for (const userResult of userResults) {
                const { count } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('sender_tag', userResult.username);
                
                userResult.activity = count || 0;
            }

            // Sort by activity and add to results
            userResults
                .sort((a, b) => (b.activity || 0) - (a.activity || 0))
                .slice(0, 5)
                .forEach(({ username, source, activity }) => {
                    if (!results.find(r => r.type === 'user' && r.title === username)) {
                        results.push({
                            id: `user-${username}`,
                            type: 'user',
                            title: username,
                            subtitle: `${source === 'chat' ? 'Chat' : 'SMS'} användare${activity ? ` • ${activity} meddelanden` : ''}`,
                            icon: Users,
                            href: `/${username}`,
                            metadata: { username, source, activity }
                        });
                        
                        // Also add chat option for non-current users
                        if (username !== user?.username) {
                            results.push({
                                id: `chat-${username}`,
                                type: 'user',
                                title: `Chatta med ${username}`,
                                subtitle: 'Direktmeddelande',
                                icon: MessageSquare,
                                href: `/chat?dm=${username}`,
                                metadata: { username, source, activity }
                            });
                        }
                    }
                });

            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Sökning misslyckades');
        } finally {
            setSearchLoading(false);
        }
    }, [user]);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim()) {
                performSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, performSearch]);

    // Real chat notifications
    const fetchChatNotifications = useCallback(async () => {
        if (!user) return;
        
        try {
            const supabase = createClient();
            
            // Check if notifications were cleared recently
            const clearedTime = localStorage.getItem(`notifications-cleared-${user.username}`);
            const clearedTimestamp = clearedTime ? parseInt(clearedTime) : 0;
            const now = Date.now();
            
            // If cleared within the last 30 minutes, don't show notifications
            if (now - clearedTimestamp < 30 * 60 * 1000) {
                setRecentMessages([]);
                setUnreadCount(0);
                return;
            }
            
            // Get recent messages from the last 24 hours that aren't from the current user
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const clearedTimeISO = new Date(clearedTimestamp).toISOString();
            
            const { data: messages, error } = await supabase
                .from('chat')
                .select('*')
                .gte('created_at', yesterday)
                .gt('created_at', clearedTimeISO) // Only show messages after last clear
                .neq('username', user.username)
                .neq('username', user.email?.split('@')[0]?.toUpperCase()) // Also filter by email-based username
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching chat notifications:', error);
                return;
            }

            // Group messages by room and get the latest from each
            const messageMap = new Map<string, ChatNotification>();
            
            messages?.forEach(msg => {
                const key = msg.room_name || 'global';
                if (!messageMap.has(key)) {
                    messageMap.set(key, {
                        id: msg.id,
                        content: msg.content,
                        username: msg.username,
                        room_name: msg.room_name || 'global',
                        created_at: msg.created_at,
                        is_dm: msg.room_name !== 'global'
                    });
                }
            });

            const recent = Array.from(messageMap.values());
            setRecentMessages(recent);
            setUnreadCount(recent.length);
            
        } catch (error) {
            console.error('Error fetching chat notifications:', error);
        }
    }, [user]);

    // Auth initialization
    const initAuth = useCallback(async () => {
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!session?.user || error) {
            setUser(null);
            setLoading(false);
            setAuthInit(true);
            return;
        }

        setUser(constructUserData(session.user));
        setLoading(false);
        setAuthInit(true);
    }, []);

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY) {
            setLoading(false);
            setAuthInit(true);
            return;
        }

        initAuth();
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, sess) => {
            if (sess?.user) {
                setUser(constructUserData(sess.user));
            } else {
                setUser(null);
                setUnreadCount(0);
                setRecentMessages([]);
            }
        });

        return () => subscription.unsubscribe();
    }, [initAuth]);

    // Fetch notifications when user changes
    useEffect(() => {
        if (user) {
            fetchChatNotifications();
            
            // Set up real-time subscription for new messages
            const supabase = createClient();
            const channel = supabase.channel('header-notifications')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat'
                }, (payload) => {
                    const newMessage = payload.new as { id: string; content: string; username: string; room_name: string; created_at: string };
                    
                    // Only process messages from other users (check both username formats)
                    const currentUsernames = [user.username, user.email?.split('@')[0]?.toUpperCase()].filter(Boolean);
                    if (currentUsernames.includes(newMessage.username)) return;
                    
                    // Check if notifications were cleared recently
                    const clearedTime = localStorage.getItem(`notifications-cleared-${user.username}`);
                    const clearedTimestamp = clearedTime ? parseInt(clearedTime) : 0;
                    const messageTime = new Date(newMessage.created_at).getTime();
                    
                    // Don't show notification if message is older than last clear
                    if (messageTime <= clearedTimestamp) return;
                    
                    setRecentMessages(prev => {
                        const key = newMessage.room_name || 'global';
                        const existing = prev.find(msg => 
                            (msg.room_name === key) || 
                            (msg.room_name === 'global' && key === 'global')
                        );
                        
                        if (existing) {
                            // Update existing message
                            return prev.map(msg => 
                                (msg.room_name === key) || 
                                (msg.room_name === 'global' && key === 'global')
                                    ? {
                                        ...msg,
                                        content: newMessage.content,
                                        username: newMessage.username,
                                        created_at: newMessage.created_at
                                    }
                                    : msg
                            );
                        } else {
                            // Add new message
                            return [{
                                id: newMessage.id,
                                content: newMessage.content,
                                username: newMessage.username,
                                room_name: newMessage.room_name || 'global',
                                created_at: newMessage.created_at,
                                is_dm: newMessage.room_name !== 'global'
                            }, ...prev.slice(0, 9)]; // Keep only 10 messages
                        }
                    });
                    setUnreadCount(prev => prev + 1);
                    
                    // Show toast notification
                    toast.success(`Nytt meddelande från ${newMessage.username}`, {
                        description: newMessage.content.length > 50 
                            ? newMessage.content.substring(0, 50) + '...' 
                            : newMessage.content
                    });
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user, fetchChatNotifications]);

    const handleLogout = useCallback(async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) return;
        setUser(null);
        setUnreadCount(0);
        setRecentMessages([]);
        setMenuOpen(false);
        router.push('/auth/login');
    }, [router]);

    const handleNotificationClick = (notification: ChatNotification) => {
        setShowNotifications(false);
        if (notification.is_dm) {
            router.push(`/chat?dm=${notification.username}`);
        } else {
            router.push('/chat');
        }
    };

    const clearNotifications = async () => {
        setUnreadCount(0);
        setRecentMessages([]);
        setShowNotifications(false);
        
        // Store cleared state in localStorage to persist across refreshes
        if (user) {
            const clearTime = Date.now().toString();
            localStorage.setItem(`notifications-cleared-${user.username}`, clearTime);
            
            // Also clear for email-based username if different
            const emailUsername = user.email?.split('@')[0]?.toUpperCase();
            if (emailUsername && emailUsername !== user.username) {
                localStorage.setItem(`notifications-cleared-${emailUsername}`, clearTime);
            }
            
            // Show confirmation toast
            toast.success('Notifieringar rensade');
        }
    };

    const handleSearchResultClick = (result: SearchResult) => {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        router.push(result.href);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowSearch(false);
            setSearchQuery('');
            setSearchResults([]);
        } else if (e.key === 'Enter' && searchResults.length > 0) {
            handleSearchResultClick(searchResults[0]);
        }
    };

    // Conditional rendering AFTER all hooks
    if (!loading && !user && authInit) {
        return null;
    }

    // Show loading skeleton while initializing
    if (loading && !authInit) {
        return (
            <div className="fixed top-4 left-4 right-4 z-50 h-24 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl animate-pulse" />
        );
    }

    // Use display name from your session data: "Leffe"
    const name = user?.displayName || user?.username || 'Guest';
    const profile = user ? `/${user.username}` : '/auth/login';

    return (
        <header
            className={`
                fixed top-4 left-4 right-4 z-50
                transition-all duration-500 ease-in-out rounded-2xl
                ${scrolled
                ? 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl shadow-xl'
                : 'bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl shadow-lg'}
                border border-white/20 dark:border-white/10
            `}
        >
            {/* gradient bg */}
            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10
                      dark:from-blue-400/5 dark:via-purple-400/5 dark:to-pink-400/5 rounded-2xl" />

            <div className="relative z-10 container mx-auto max-w-7xl px-6 py-3">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                        <Link href="/hem" className="group">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500
                             dark:from-blue-400 dark:via-purple-400 dark:to-cyan-400 bg-clip-text text-transparent
                             group-hover:scale-105 transition-transform duration-300">
                                Audika SMS
                            </h1>
                        </Link>
                    </motion.div>

                    {/* Desktop nav */}
                    <motion.nav
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="hidden lg:flex items-center space-x-1"
                    >
                        {navigationItems.map((item, i) => {
                            const active = pathname === item.href;
                            return (
                                <motion.div
                                    key={item.href}
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.3 + i*0.1 }}
                                    whileHover={{ 
                                        y: -2,
                                        transition: { duration: 0.2, ease: "easeOut" }
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        variant="ghost"
                                        asChild
                                        className={`
                                            relative px-4 py-2 rounded-xl font-medium
                                            ${active
                                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-md'
                                            : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-300'}
                                        `}
                                    >
                                        <Link href={item.href} className="flex items-center space-x-2">
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </Button>
                                </motion.div>
                            );
                        })}
                    </motion.nav>

                    {/* Right actions */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex items-center space-x-3">

                        {/* Global Search */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative" ref={searchRef}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="hidden md:flex h-10 w-10 p-0 rounded-xl bg-white/30 dark:bg-slate-700/30 hover:bg-white/50 dark:hover:bg-slate-600/50 transition-all duration-300" 
                                            aria-label="Global Search"
                                            onClick={() => setShowSearch(!showSearch)}
                                        >
                                <Search className="h-4 w-4" />
                            </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Global sökning</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            {/* Search Dropdown */}
                            <AnimatePresence>
                                {showSearch && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-12 right-0 w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl z-50"
                                    >
                                        <div className="p-4">
                                            <div className="relative mb-4">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Sök patienter, meddelanden, användare..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    onKeyDown={handleSearchKeyDown}
                                                    className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                                    autoFocus
                                                />
                                                {searchLoading && (
                                                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                                                )}
                                            </div>
                                            
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {searchQuery.trim() === '' ? (
                                                    <div className="text-center py-8">
                                                        <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Börja skriva för att söka
                                                        </p>
                                                    </div>
                                                ) : searchResults.length === 0 && !searchLoading ? (
                                                    <div className="text-center py-8">
                                                        <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Inga resultat hittade
                                                        </p>
                                                    </div>
                                                ) : (
                                                    searchResults.map((result) => (
                                                        <motion.div
                                                            key={result.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            whileHover={{ 
                                                                y: -2,
                                                                transition: { duration: 0.2, ease: "easeOut" }
                                                            }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200"
                                                            onClick={() => handleSearchResultClick(result)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-shrink-0">
                                                                    <result.icon className="w-5 h-5 text-purple-500" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                                            {result.title}
                                                                        </span>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {result.type === 'patient' ? 'Patient' : 
                                                                             result.type === 'message' ? 'Meddelande' : 'Användare'}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                                                                        {result.subtitle}
                                                                    </p>
                                                                </div>
                                                                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </div>
                                            
                                            {searchQuery.trim() && (
                                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                                        Tryck Enter för första resultatet • Esc för att stänga
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Real Chat Notifications */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative" ref={notificationRef}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="hidden md:flex h-10 w-10 p-0 rounded-xl bg-white/30 dark:bg-slate-700/30 hover:bg-white/50 dark:hover:bg-slate-600/50 transition-all duration-300 relative" 
                                            aria-label="Chat Notifications"
                                            onClick={() => setShowNotifications(!showNotifications)}
                                        >
                                <Bell className="h-4 w-4" />
                                            {unreadCount > 0 && (
                                                <motion.div 
                                                    initial={{ scale: 0 }} 
                                                    animate={{ scale: 1 }} 
                                                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center animate-pulse shadow-lg"
                                                >
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </motion.div>
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Chat meddelanden ({unreadCount})</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            {/* Notifications Dropdown */}
                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-12 right-0 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl z-50"
                                    >
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                                    Senaste meddelanden
                                                </h3>
                                                {unreadCount > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={clearNotifications}
                                                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                    >
                                                        Rensa alla
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                                {recentMessages.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Inga nya meddelanden
                                                        </p>
                                                    </div>
                                                ) : (
                                                    recentMessages.map((notification) => (
                                                        <motion.div
                                                            key={notification.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            whileHover={{ 
                                                                y: -2,
                                                                transition: { duration: 0.2, ease: "easeOut" }
                                                            }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200"
                                                            onClick={() => handleNotificationClick(notification)}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={generateCartoonAvatar(notification.username)} alt={notification.username} />
                                                                    <AvatarFallback className="text-white text-xs font-semibold bg-gradient-to-br from-purple-500 to-pink-500">
                                                                        {getInitials(notification.username)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                                            {notification.username}
                                                                        </span>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {notification.is_dm ? 'DM' : 'Global'}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                                        {notification.content}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                                        {formatRelativeTime(notification.created_at)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </div>
                                            
                                            {recentMessages.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full"
                                                        onClick={() => {
                                                            setShowNotifications(false);
                                                            router.push('/chat');
                                                        }}
                                                    >
                                                        <MessageSquareMore className="w-4 h-4 mr-2" />
                                                        Visa alla meddelanden
                            </Button>
                                                </div>
                                            )}
                                        </div>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Theme */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <ThemeSwitcher />
                        </motion.div>

                        {/* Logout Button */}
                        {user && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleLogout}
                                                className="h-10 w-10 p-0 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-300"
                                            >
                                                <LogOut className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Logga ut</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        {/* Profile - Larger Avatar & Name (Clickable to Profile) */}
                        {user && (
                            <div className="hidden md:flex items-center space-x-3">
                                <motion.div whileHover={{ 
                                    y: -2,
                                    transition: { duration: 0.2, ease: "easeOut" }
                                }} className="relative">
                                    <Link href={profile}>
                                        <Button variant="ghost" className="flex items-center space-x-3 px-4 py-2 h-12 rounded-xl bg-white/30 dark:bg-slate-700/30 hover:bg-white/50 dark:hover:bg-slate-600/50 transition-all duration-300">
                                            <Avatar className="h-8 w-8">
                                                {user.avatarUrl ? (
                                                    <AvatarImage src={user.avatarUrl} alt={name} />
                                                ) : (
                                                    <AvatarImage src={generateCartoonAvatar(name)} alt={name} />
                                                )}
                                                <AvatarFallback className="text-white text-sm font-semibold bg-gradient-to-br from-purple-500 to-pink-500">
                                                    {getInitials(name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</span>
                                        </Button>
                                    </Link>
                                </motion.div>
                                
                                {/* Logout Button */}
                                <motion.div whileHover={{ 
                                    y: -2,
                                    transition: { duration: 0.2, ease: "easeOut" }
                                }}>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={handleLogout}
                                                    className="h-10 w-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-all duration-300"
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                                <p>Logga ut</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </motion.div>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="lg:hidden">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 rounded-xl bg-white/30 dark:bg-slate-700/30 hover:bg-white/50 dark:hover:bg-slate-600/50 transition-all duration-300"
                                onClick={() => setMenuOpen(!menuOpen)}
                            >
                                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                            </Button>
                        </motion.div>
                    </motion.div>
            </div>

                {/* Mobile menu */}
            <AnimatePresence>
                {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="lg:hidden border-t border-gray-200 dark:border-gray-700 mt-4 pt-4"
                        >
                            <nav className="space-y-2">
                                {navigationItems.map((item) => {
                                    const active = pathname === item.href;
                                    return (
                                        <Button
                                            key={item.href}
                                            variant="ghost"
                                            asChild
                                            className={`
                                                w-full justify-start px-4 py-3 rounded-xl font-medium
                                                ${active
                                                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                                : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-300'}
                                            `}
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            <Link href={item.href} className="flex items-center space-x-3">
                                            <item.icon className="h-5 w-5" />
                                            <span>{item.label}</span>
                                        </Link>
                                        </Button>
                                    );
                                })}
                            </nav>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </header>
    );
}