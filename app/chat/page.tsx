'use client'

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, User, Globe, Users, Settings, X } from 'lucide-react';
import { RealtimeChat } from '@/components/realtime-chat';
import { useEffect, useState, useRef } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateCartoonAvatar } from '@/lib/avatar-utils';

const supabase = createClient();

interface OnlineUser {
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

type ChatTab = {
  id: string;
  type: 'global' | 'dm';
  name: string;
  username?: string;
  isActive: boolean;
  unreadCount?: number;
  lastMessageTime?: string;
};

// Local storage keys
const CHAT_TABS_KEY = 'audika_chat_tabs'
const ACTIVE_TAB_KEY = 'audika_active_tab'

// Helper function to get initials
const getInitials = (name: string): string => {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'U';
};

export default function ChatPage() {
    const [userDisplayName, setUserDisplayName] = useState<string>('User');
    const [currentUserSession, setCurrentUserSession] = useState<{ id: string; email?: string; user_metadata?: { display_name?: string; full_name?: string } } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [isOnline, setIsOnline] = useState(false);
    const [chatTabs, setChatTabs] = useState<ChatTab[]>([]);
    const [activeTab, setActiveTab] = useState<string>('global');
    const [showSettings, setShowSettings] = useState(false);
    const [showAllUsers, setShowAllUsers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<{ subscribe: (callback: (payload: { presence: Record<string, unknown> }) => void) => { unsubscribe: () => void } } | null>(null);
    const mountedRef = useRef(true);

    // Load chat tabs from localStorage on mount
    useEffect(() => {
        try {
            const savedTabs = localStorage.getItem(CHAT_TABS_KEY);
            const savedActiveTab = localStorage.getItem(ACTIVE_TAB_KEY);
            
            if (savedTabs) {
                const parsedTabs = JSON.parse(savedTabs) as ChatTab[];
                setChatTabs(parsedTabs);
                
                if (savedActiveTab && parsedTabs.find(tab => tab.id === savedActiveTab)) {
                    setActiveTab(savedActiveTab);
                } else {
                    setActiveTab(parsedTabs[0]?.id || 'global');
                }
            } else {
                // Initialize with default global tab
                const defaultTabs: ChatTab[] = [
                    { id: 'global', type: 'global', name: 'Global Chat', isActive: true }
                ];
                setChatTabs(defaultTabs);
                setActiveTab('global');
            }
        } catch (err) {
            console.error('Failed to load chat tabs:', err);
            // Fallback to default
            const defaultTabs: ChatTab[] = [
                { id: 'global', type: 'global', name: 'Global Chat', isActive: true }
            ];
            setChatTabs(defaultTabs);
            setActiveTab('global');
        }
    }, []);

    // Save chat tabs to localStorage whenever they change
    useEffect(() => {
        if (chatTabs.length > 0) {
            try {
                localStorage.setItem(CHAT_TABS_KEY, JSON.stringify(chatTabs));
            } catch (err) {
                console.error('Failed to save chat tabs:', err);
            }
        }
    }, [chatTabs]);

    // Save active tab to localStorage whenever it changes
    useEffect(() => {
        if (activeTab) {
            try {
                localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
            } catch (err) {
                console.error('Failed to save active tab:', err);
            }
        }
    }, [activeTab]);

    // Get user data on client side
    useEffect(() => {
        const getUserData = async () => {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
        redirect('/auth/login');
    }

                // Get user display name from metadata
                let displayName = session.user.email?.split('@')[0] ?? 'User';
                if (session.user.user_metadata?.display_name) {
                    displayName = session.user.user_metadata.display_name;
                } else if (session.user.user_metadata?.full_name) {
                    displayName = session.user.user_metadata.full_name;
                }
                
                setUserDisplayName(displayName);
                setCurrentUserSession(session.user);
                setError(null);
            } catch (err) {
                console.error('Failed to get user data:', err);
                setError('Failed to load user data');
            } finally {
                setIsLoading(false);
            }
        };

        getUserData();

        // Listen for auth state changes to update immediately when user updates their avatar
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            if (session?.user) {
                setCurrentUserSession(session.user);
                // Update display name as well
                let displayName = session.user.email?.split('@')[0] ?? 'User';
                if (session.user.user_metadata?.display_name) {
                    displayName = session.user.user_metadata.display_name;
                } else if (session.user.user_metadata?.full_name) {
                    displayName = session.user.user_metadata.full_name;
                }
                setUserDisplayName(displayName);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Set up presence tracking (same as footer)
    useEffect(() => {
        mountedRef.current = true;

        const supabase = createClient();

        // Create stable presence key
        const getPresenceKey = () => {
            const stored = sessionStorage.getItem('presence_key');
            if (stored) return stored;

            const newKey = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            sessionStorage.setItem('presence_key', newKey);
            return newKey;
        };

        const presenceKey = getPresenceKey();

        // Create channel with presence configuration
        const channel = supabase
            .channel('online-users', {
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
                    const userList: OnlineUser[] = [];
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
                                        lastActive: presence.lastActive || new Date().toISOString()
                                    }
                                });
                            }
                        }
                    });

                    setOnlineUsers(userList);
                    setIsOnline(true);
                    setError(null);
                } catch (err) {
                    console.error('Failed to load users:', err);
                    setError('Failed to load online users');
                }
            });

        channelRef.current = channel;

        // Subscribe and track presence
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && mountedRef.current) {
                try {
                    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

                    if (authError || !currentUser) {
                        setIsOnline(false);
                        setError('Authentication failed');
                        return;
                    }

                    // Construct user data
                    const emailBase = currentUser.email?.split('@')[0]?.toUpperCase() || 'USER';
                    const metadata = currentUser.user_metadata || {};
                    let displayName = emailBase;
                    if (metadata.display_name) {
                        displayName = metadata.display_name;
                    } else if (metadata.full_name) {
                        displayName = metadata.full_name;
                    }

                    // Track presence with current timestamp
                    await channel.track({
                        username: emailBase,
                        displayName: displayName,
                        avatarUrl: metadata.avatar_url || '',
                        role: metadata.role || 'User',
                        lastActive: new Date().toISOString(),
                    });

                    setError(null);
                } catch (err) {
                    console.error('Failed to connect:', err);
                    setIsOnline(false);
                    setError('Failed to connect to presence system');
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

    // Handle starting a DM
    const startDM = (user: OnlineUser) => {
        const dmId = `dm-${user.metadata.username}`;
        const dmName = user.metadata.displayName || user.metadata.username;
        
        // Check if DM tab already exists
        const existingTab = chatTabs.find(tab => tab.id === dmId);
        if (existingTab) {
            // Switch to existing tab
            const newTabs = chatTabs.map(tab => ({
                ...tab,
                isActive: tab.id === dmId
            }));
            setChatTabs(newTabs);
            setActiveTab(dmId);
            return;
        }

        // Add new DM tab
        const newTabs = chatTabs.map(tab => ({ ...tab, isActive: false }));
        newTabs.push({
            id: dmId,
            type: 'dm',
            name: dmName,
            username: user.metadata.username,
            isActive: true,
            unreadCount: 0,
            lastMessageTime: new Date().toISOString()
        });

        setChatTabs(newTabs);
        setActiveTab(dmId);
    };

    // Handle closing a tab
    const closeTab = (tabId: string) => {
        if (chatTabs.length <= 1) return; // Don't close the last tab
        
        const newTabs = chatTabs.filter(tab => tab.id !== tabId);
        const wasActive = chatTabs.find(tab => tab.id === tabId)?.isActive;
        
        if (wasActive) {
            // Switch to the first available tab
            newTabs[0].isActive = true;
            setActiveTab(newTabs[0].id);
        }
        
        setChatTabs(newTabs);
    };

    // Handle tab switching
    const switchTab = (tabId: string) => {
        const newTabs = chatTabs.map(tab => ({
            ...tab,
            isActive: tab.id === tabId,
            unreadCount: tab.id === tabId ? 0 : tab.unreadCount // Clear unread count when switching to tab
        }));
        setChatTabs(newTabs);
        setActiveTab(tabId);
    };

    // Handle settings button
    const handleSettings = () => {
        setShowSettings(!showSettings);
        // You can add actual settings functionality here
        console.log('Settings clicked - implement settings modal/page');
    };

    // Handle view all users
    const handleViewAll = () => {
        setShowAllUsers(!showAllUsers);
        // You can add actual view all functionality here
        console.log('View All clicked - implement expanded users view');
    };

    if (isLoading) {
        return (
            <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8 relative">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8 relative">
            {/* Enhanced animated background elements */}
            <div className="absolute inset-0 overflow-visible pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-pink-400/10 to-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
                <div className="absolute top-20 right-1/4 w-32 h-32 bg-gradient-to-br from-yellow-400/15 to-orange-600/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute bottom-40 left-1/4 w-24 h-24 bg-gradient-to-br from-green-400/15 to-emerald-600/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />
            </div>

            <div className="relative z-10 space-y-8">
                {/* Error Display */}
                {error && (
                    <div className="bg-red-100/80 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-center animate-in fade-in duration-300">
                        <p className="font-medium">⚠️ {error}</p>
                        <p className="text-sm mt-1">Please refresh the page or try again later.</p>
                            </div>
                )}

                {/* Simplified Welcome Section */}
                <div className="text-center mb-8 animate-in fade-in duration-700">
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                            Audika Chat
                        </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Welcome back, <span className="font-semibold text-purple-600 dark:text-purple-400">{userDisplayName}</span>! 
                        Join the conversation below.
                    </p>
                </div>

                {/* Main Chat Section */}
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Chat Interface */}
                    <div className="lg:col-span-3">
                        <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg group animate-in slide-in-from-bottom-4 duration-700">
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-500/10 to-pink-500/10 transition-opacity duration-500 rounded-3xl" />
                            
                            <div className="relative z-10">
                                {/* Chat Tabs */}
                                <div className="flex items-center border-b border-white/20 dark:border-white/10 bg-white/20 dark:bg-black/20 rounded-t-3xl overflow-x-auto">
                                    {chatTabs.map((tab) => (
                                        <div
                                            key={tab.id}
                                            className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-300 min-w-0 flex-shrink-0 ${
                                                tab.isActive
                                                    ? 'bg-white/40 dark:bg-black/40 border-b-2 border-purple-500'
                                                    : 'hover:bg-white/20 dark:hover:bg-black/20'
                                            }`}
                                            onClick={() => switchTab(tab.id)}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {tab.type === 'global' ? (
                                                    <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                                ) : (
                                                    <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                                )}
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {tab.name}
                                                </span>
                                                {tab.unreadCount && tab.unreadCount > 0 && (
                                                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                                        {tab.unreadCount > 99 ? '99+' : tab.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            {tab.type === 'dm' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        closeTab(tab.id);
                                                    }}
                                                    className="ml-2 p-1 rounded-full hover:bg-white/20 dark:hover:bg-black/20 transition-all duration-300 flex-shrink-0"
                                                >
                                                    <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Chat Content - Render separate chat instances for each tab */}
                                <div className="p-0">
                                    {chatTabs.map((tab) => (
                                        <div
                                            key={tab.id}
                                            className={tab.isActive ? 'block' : 'hidden'}
                                        >
                                            <RealtimeChat 
                                                roomName={tab.type === 'dm' ? `dm-${tab.username}` : 'global'} 
                                                username={userDisplayName} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Enhanced User Profile Card */}
                        <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-lg group animate-in slide-in-from-right-4 duration-700">
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 transition-opacity duration-500 rounded-3xl" />
                            
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md">
                                        <User className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Profile</h3>
                                    </div>
                                    <button 
                                        onClick={handleSettings}
                                        className="p-2 rounded-lg bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-300"
                                        title="Settings"
                                    >
                                        <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>

                                {/* Settings Panel (hidden by default) */}
                                {showSettings && (
                                    <div className="mt-4 p-4 bg-white/20 dark:bg-black/20 rounded-xl border border-white/20 dark:border-white/10">
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Settings</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Settings panel coming soon! 🚀
                                        </p>
                                    </div>
                                )}

                                <div className="text-center">
                                    <div className="relative mx-auto w-16 h-16 mb-4">
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full blur-lg opacity-50 scale-110 animate-pulse" />
                                        <Avatar className="relative w-16 h-16 border-2 border-white/50 shadow-lg">
                                            <AvatarImage 
                                                src={currentUserSession?.user_metadata?.avatar_url || generateCartoonAvatar(userDisplayName)} 
                                                alt={userDisplayName} 
                                            />
                                            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                                                {getInitials(userDisplayName)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{userDisplayName}</h4>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Active user</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                                        <span className={`text-xs font-medium ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extended Online Users Card */}
                        <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-lg group animate-in slide-in-from-right-4 duration-700" style={{ animationDelay: '200ms' }}>
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-green-500/10 to-emerald-500/10 transition-opacity duration-500 rounded-3xl" />
                            
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
                                        <Users className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Online Users</h3>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100/80 dark:bg-green-900/30 rounded-full">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-xs text-green-700 dark:text-green-400 font-medium">{onlineUsers.length}</span>
                                        </div>
                                    </div>
                                    
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {onlineUsers.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No users online</p>
                                        </div>
                                    ) : (
                                        onlineUsers.map((user) => {
                                            const displayName = user.metadata.displayName || user.metadata.username;
                                            
                                            // Check if this is the current user
                                            const isCurrentUser = currentUserSession && 
                                                currentUserSession.email?.split('@')[0]?.toUpperCase() === user.metadata.username;
                                            
                                            // Use session data for current user's avatar, otherwise use presence data
                                            const avatarName = isCurrentUser ? 
                                                (currentUserSession.user_metadata?.display_name || currentUserSession.user_metadata?.full_name || user.metadata.username) :
                                                displayName;
                                            
                                            return (
                                                <div 
                                                    key={user.id} 
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-300 cursor-pointer group/user"
                                                    onClick={() => startDM(user)}
                                                >
                                                    <div className="relative">
                                                        <Avatar className="w-10 h-10 ring-2 ring-white/40 dark:ring-slate-600/40">
                                                            {user.metadata.avatarUrl ? (
                                                                <AvatarImage src={user.metadata.avatarUrl} alt={displayName} />
                                                            ) : (
                                                                <AvatarImage src={generateCartoonAvatar(avatarName)} alt={displayName} />
                                                            )}
                                                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-medium">
                                                                {getInitials(displayName)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                            {displayName}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {user.metadata.lastActive === 'now' ? 'Active now' : `Active ${formatRelativeTime(user.metadata.lastActive)}`}
                                                        </p>
                                                    </div>
                                                    <button className="opacity-0 group-hover/user:opacity-100 p-2 rounded-lg bg-purple-100/80 dark:bg-purple-900/30 hover:bg-purple-200/80 dark:hover:bg-purple-800/30 transition-all duration-300">
                                                        <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Quick Actions Footer */}
                                <div className="mt-4 pt-4 border-t border-white/20 dark:border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            Click a user to start a DM
                                        </span>
                                        <button 
                                            onClick={handleViewAll}
                                            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-300"
                                        >
                                            View All
                                        </button>
                                    </div>
                                </div>

                                {/* View All Users Panel (hidden by default) */}
                                {showAllUsers && (
                                    <div className="mt-4 p-4 bg-white/20 dark:bg-black/20 rounded-xl border border-white/20 dark:border-white/10">
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">All Online Users</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Expanded users view coming soon! 👥
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
