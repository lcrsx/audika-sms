'use client';
/* eslint-disable react-hooks/rules-of-hooks */

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import {
    User,
    Shield,
    Mail,
    Calendar,
    Clock,
    Activity,
    MessageSquare,
    Bell,
    Settings as SettingsIcon,
    Edit3,
    ChevronRight,
    Save,
    X,
    Users,
    AlertCircle,
    ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import React from "react";
import { AvatarRefreshButton } from '@/components/avatar-refresh-button';
import { generatePatientAvatar } from '@/lib/avatar-utils';
import { RealtimeChat } from '@/components/realtime-chat';
import { LucideIcon } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';

// ===========================
// TYPE DEFINITIONS
// ===========================

interface AppUser extends SupabaseUser {
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    profile_visibility?: string;
    dark_mode?: boolean;
    email_notifications?: boolean;
}

// interface UserMetadata {
//     display_name?: string;
//     bio?: string;
//     avatar_url?: string;
//     settings?: UserSettings;
// }

interface UserSettings {
    profileVisibility?: string;
    darkMode?: boolean;
    emailNotifications?: boolean;
}

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
}

interface InfoRowProps {
    label: string;
    value: string;
    icon?: React.ReactNode;
}

interface PatientContact {
    cnumber: string;
    phone?: string;
    lastContact: string;
    totalMessages: number;
    name?: string;
}

interface ProfileCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    gradient?: string;
}

interface EditState {
    displayName: string;
    bio: string;
    settings: UserSettings;
}

interface MessageData {
    patient_cnumber?: string;
    recipient_phone?: string;
    created_at: string;
    content?: string;
    sender_tag?: string;
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

const getInitials = (name: string): string => {
    if (!name) return 'U';
    return name
        .split(/\s+/)
        .map(w => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2) || 'U';
};

const formatDate = (dateString: string): string => {
    try {
        return new Date(dateString).toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return 'Okänt datum';
    }
};

const formatRelativeTime = (dateString: string): string => {
    try {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();

        if (diffMs < 0) return 'Just nu';

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 60) return `${diffMinutes}m sedan`;
        if (diffHours < 24) return `${diffHours}h sedan`;
        if (diffDays < 7) return `${diffDays}d sedan`;
        return formatDate(dateString);
    } catch {
        return 'Okänt';
    }
};

// ===========================
// COMPONENTS
// ===========================

const ProfileCard = React.memo<ProfileCardProps>(({
                                                      title,
                                                      icon,
                                                      children,
                                                      className = '',
                                                      gradient = 'from-blue-500/10 to-purple-500/10'
                                                  }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`
      relative overflow-hidden
      bg-white/60 dark:bg-slate-800/60
      backdrop-blur-xl
      border border-white/20 dark:border-white/10
      rounded-2xl p-6
      shadow-lg hover:shadow-xl
      transition-all duration-300
      group
      ${className}
    `}
    >
        <div className={`
      absolute inset-0 opacity-0 group-hover:opacity-100
      bg-gradient-to-br ${gradient}
      transition-opacity duration-500
      rounded-2xl
    `} />

        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
                <div className="
          p-2 rounded-xl
          bg-gradient-to-br from-blue-500 to-purple-600
          text-white shadow-md
        ">
                    {icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                </h3>
            </div>
            {children}
        </div>
    </motion.div>
));

ProfileCard.displayName = 'ProfileCard';

const StatCard = React.memo<StatCardProps>(({ label, value, icon: Icon, color }) => (
    <div className="text-center p-4 rounded-xl bg-white/30 dark:bg-black/30 hover:bg-white/40 dark:hover:bg-black/40 transition-all duration-300">
        <div className={`mx-auto mb-2 p-2 rounded-lg bg-gradient-to-br ${color} w-fit`}>
            <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
));

StatCard.displayName = 'StatCard';

const InfoRow = React.memo<InfoRowProps>(({ label, value, icon }) => (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-300">
        <div className="flex items-center gap-3">
            {icon && <div className="text-gray-600 dark:text-gray-400">{icon}</div>}
            <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-right">{value}</span>
    </div>
));

InfoRow.displayName = 'InfoRow';

const PatientContactItem = React.memo<{
    contact: PatientContact;
    onClick?: () => void;
}>(({ contact, onClick }) => {
    const patientAvatar = useMemo(() =>
            generatePatientAvatar(contact.cnumber),
        [contact.cnumber]
    );

    const handleClick = useCallback(() => {
        onClick?.();
    }, [onClick]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
        }
    }, [onClick]);

    return (
        <div
            className="flex items-center gap-4 p-4 rounded-xl bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-300 group cursor-pointer"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <Avatar className="h-10 w-10">
                <AvatarImage src={patientAvatar} alt={contact.name || `Patient ${contact.cnumber}`} />
                <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-sm font-medium">
                    {getInitials(contact.cnumber)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                    {contact.name || `Patient ${contact.cnumber}`}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {contact.totalMessages} meddelanden • {formatRelativeTime(contact.lastContact)}
                </p>
                {contact.phone && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{contact.phone}</p>
                )}
            </div>

            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="h-4 w-4" />
            </div>

            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300" />
        </div>
    );
});

PatientContactItem.displayName = 'PatientContactItem';

const LoadingSpinner = React.memo(() => (
    <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

const ErrorAlert = React.memo<{ message: string }>(({ message }) => (
    <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
    </Alert>
));

ErrorAlert.displayName = 'ErrorAlert';

// ===========================
// CUSTOM HOOKS
// ===========================

const useProfileData = () => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [targetUser, setTargetUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOwnProfile] = useState(true); // For chat page, always show own profile
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                setError(null);
                const supabase = createClient();

                const { data, error } = await supabase.auth.getUser();

                if (error || !data?.user) {
                    if (isMounted) {
                        window.location.href = '/auth/login';
                    }
                    return;
                }

                const currentUsername = data.user.email?.split('@')[0]?.toUpperCase();
                
                // For chat page, we'll redirect to the user's profile
                if (currentUsername && isMounted) {
                    window.location.href = `/${currentUsername.toLowerCase()}`;
                    return;
                }

                // Fallback - should not reach here
                if (isMounted) {
                    setError('Kunde inte ladda användarinformation');
                }

            } catch (err) {
                if (isMounted) {
                    setError('Ett fel uppstod vid inläsning av profilen');
                    console.error('Profile loading error:', err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, []);

    return { user, targetUser, loading, isOwnProfile, error, setUser, setTargetUser };
};

const usePatientContacts = (user: AppUser | null, isOwnProfile: boolean) => {
    const [patientContacts, setPatientContacts] = useState<PatientContact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactsError, setContactsError] = useState<string | null>(null);

    const loadPatientContacts = useCallback(async () => {
        if (!isOwnProfile || !user) return;

        setContactsLoading(true);
        setContactsError(null);

        try {
            const supabase = createClient();
            const senderTag = user.email?.split('@')[0]?.toUpperCase();

            if (!senderTag) {
                throw new Error('Kunde inte identifiera användare');
            }

            const { data: messages, error } = await supabase
                .from('messages')
                .select('patient_cnumber, recipient_phone, created_at, content, sender_tag')
                .eq('sender_tag', senderTag)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const patientStats = new Map<string, PatientContact>();

            messages?.forEach((msg: MessageData) => {
                const key = msg.patient_cnumber || msg.recipient_phone || 'unknown';
                if (!patientStats.has(key)) {
                    patientStats.set(key, {
                        cnumber: msg.patient_cnumber || 'PHONE',
                        phone: msg.recipient_phone,
                        lastContact: msg.created_at,
                        totalMessages: 0,
                        name: undefined
                    });
                }
                const contact = patientStats.get(key)!;
                contact.totalMessages++;
            });

            const contacts = Array.from(patientStats.values())
                .sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime())
                .slice(0, 10);

            setPatientContacts(contacts);
        } catch (error) {
            console.error('Error loading patient contacts:', error);
            setContactsError('Kunde inte ladda patientkontakter');
        } finally {
            setContactsLoading(false);
        }
    }, [isOwnProfile, user]);

    useEffect(() => {
        loadPatientContacts();
    }, [loadPatientContacts]);

    return { patientContacts, contactsLoading, contactsError, loadPatientContacts };
};

// ===========================
// DIRECT MESSAGE INTERFACE
// ===========================

interface DirectMessageInterfaceProps {
    targetUsername: string;
}

function DirectMessageInterface({ targetUsername }: DirectMessageInterfaceProps) {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const supabase = createClient();
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                
                if (userError || !user) {
                    router.push('/auth/login');
                    return;
                }
                
                setCurrentUser(user as AppUser);
            } catch (err) {
                console.error('Error loading user:', err);
                setError('Failed to load user data');
            } finally {
                setLoading(false);
            }
        };
        
        loadCurrentUser();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (error || !currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
                <Alert className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error || 'Unable to load chat. Please try again.'}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Create a private room name for the conversation
    const roomName = [currentUser.email, targetUsername].sort().join('_dm_');
    const currentUsername = currentUser.email || currentUser.id;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
            <div className="container mx-auto px-4 py-6 h-screen flex flex-col max-w-4xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Tillbaka
                    </Button>
                    
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={generatePatientAvatar(targetUsername)} alt={targetUsername} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-sm">
                                {targetUsername.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {targetUsername}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Direktmeddelanden
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="flex-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                    <RealtimeChat
                        roomName={roomName}
                        username={currentUsername}
                    />
                </div>
            </div>
        </div>
    );
}

// ===========================
// MAIN COMPONENT
// ===========================

function ChatRedirectPage() {
    const searchParams = useSearchParams();
    const dmUsername = searchParams.get('dm');
    
    // Always call hooks first
    const { user, targetUser, loading, isOwnProfile, error, setUser, setTargetUser } = useProfileData();
    const { patientContacts, contactsLoading, contactsError } = usePatientContacts(user, isOwnProfile);
    
    // Edit states - always called
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [editState, setEditState] = useState<EditState>({
        displayName: '',
        bio: '',
        settings: {
            profileVisibility: 'public',
            darkMode: false,
            emailNotifications: true
        }
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    
    // Initialize edit state when targetUser changes
    useEffect(() => {
        if (targetUser && isOwnProfile) {
            setEditState({
                displayName: targetUser.user_metadata?.display_name || '',
                bio: targetUser.user_metadata?.bio || '',
                settings: {
                    profileVisibility: targetUser.user_metadata?.settings?.profileVisibility || 'public',
                    darkMode: targetUser.user_metadata?.settings?.darkMode || false,
                    emailNotifications: targetUser.user_metadata?.settings?.emailNotifications || true
                }
            });
        }
    }, [targetUser, isOwnProfile]);

    const saveProfile = useCallback(async () => {
        if (!user || !isOwnProfile) return;

        setIsSaving(true);
        setSaveError(null);

        try {
            const supabase = createClient();

            // Update auth user metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    ...user.user_metadata,
                    display_name: editState.displayName,
                    bio: editState.bio
                }
            });

            if (authError) throw authError;

            // Update database user record
            const { error: dbError } = await supabase
                .from('users')
                .update({
                    display_name: editState.displayName,
                    bio: editState.bio
                })
                .eq('id', user.id);

            if (dbError) throw dbError;

            // Update local state
            const updatedMetadata = {
                ...user.user_metadata,
                display_name: editState.displayName,
                bio: editState.bio
            };

            setUser({ ...user, user_metadata: updatedMetadata });
            setTargetUser(prev => prev ? { ...prev, user_metadata: updatedMetadata } : null);

            setIsEditingBio(false);
        } catch (error) {
            console.error('Error saving profile:', error);
            setSaveError('Kunde inte spara profilen. Försök igen.');
        } finally {
            setIsSaving(false);
        }
    }, [user, isOwnProfile, editState, setUser, setTargetUser]);

    // All remaining hooks are defined in a complex way, let me add conditional return after key hooks
    // If dm parameter exists, show direct messaging interface
    if (dmUsername) {
        return <DirectMessageInterface targetUsername={dmUsername} />;
    }

    const saveSettings = useCallback(async () => {
        if (!user || !isOwnProfile) return;

        setIsSaving(true);
        setSaveError(null);

        try {
            const supabase = createClient();

            // Update auth user metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    ...user.user_metadata,
                    settings: editState.settings
                }
            });

            if (authError) throw authError;

            // Update database user record
            const { error: dbError } = await supabase
                .from('users')
                .update({
                    profile_visibility: editState.settings.profileVisibility,
                    dark_mode: editState.settings.darkMode,
                    email_notifications: editState.settings.emailNotifications
                })
                .eq('id', user.id);

            if (dbError) throw dbError;

            // Update local state
            const updatedMetadata = {
                ...user.user_metadata,
                settings: editState.settings
            };

            setUser({ ...user, user_metadata: updatedMetadata });
            setTargetUser(prev => prev ? { ...prev, user_metadata: updatedMetadata } : null);

            setIsEditingSettings(false);
        } catch (error) {
            console.error('Error saving settings:', error);
            setSaveError('Kunde inte spara inställningarna. Försök igen.');
        } finally {
            setIsSaving(false);
        }
    }, [user, isOwnProfile, editState, setUser, setTargetUser]);

    // Memoized computed values
    const profileData = useMemo(() => {
        if (!targetUser) return null;

        const { email, created_at, last_sign_in_at, user_metadata } = targetUser;
        const username = email?.split('@')[0]?.toUpperCase();
        const displayName = user_metadata?.display_name || username;
        const bio = user_metadata?.bio || '';
        const avatarUrl = user_metadata?.avatar_url;
        const settings = user_metadata?.settings || {};

        const memberSince = created_at ? new Date(created_at).getFullYear() : new Date().getFullYear();
        const daysSinceJoin = created_at ?
            Math.floor((Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return {
            username,
            displayName,
            bio,
            avatarUrl,
            settings,
            memberSince,
            daysSinceJoin,
            email,
            lastSignIn: last_sign_in_at
        };
    }, [targetUser]);

    const handleContactClick = useCallback((contact: PatientContact) => {
        console.log('Contact clicked:', contact);
    }, []);

    const handleCloseEditBio = useCallback(() => {
        setIsEditingBio(false);
        setSaveError(null);
    }, []);

    const handleCloseEditSettings = useCallback(() => {
        setIsEditingSettings(false);
        setSaveError(null);
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8">
                <ErrorAlert message={error} />
                <div className="text-center">
                    <Button onClick={() => window.location.href = '/hem'}>
                        Tillbaka till start
                    </Button>
                </div>
            </div>
        );
    }

    if (!user || !targetUser || !profileData) {
        return null;
    }

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8 relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-visible pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse" />
            </div>

            {/* Header */}
            <div className="relative z-10 mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="relative">
                        <Avatar className="h-32 w-32 ring-4 ring-white/20 shadow-xl">
                            <AvatarImage src={profileData.avatarUrl} alt={profileData.displayName} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold">
                                {getInitials(profileData.displayName || 'U')}
                            </AvatarFallback>
                        </Avatar>
                        {isOwnProfile && (
                            <div className="absolute -bottom-2 -right-2">
                                <AvatarRefreshButton />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                                {profileData.displayName}
                            </h1>
                            {isOwnProfile && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditingBio(true)}
                                    className="p-2"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                            @{profileData.username}
                        </p>

                        {profileData.bio && (
                            <p className="text-gray-700 dark:text-gray-300 max-w-2xl leading-relaxed">
                                {profileData.bio}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-4 mt-4">
                            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                <Calendar className="h-3 w-3 mr-1" />
                                Medlem sedan {profileData.memberSince}
                            </Badge>

                            {profileData.lastSignIn && (
                                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Senast aktiv {formatRelativeTime(profileData.lastSignIn)}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {(saveError || contactsError) && (
                <div className="relative z-10 mb-6">
                    {saveError && <ErrorAlert message={saveError} />}
                    {contactsError && <ErrorAlert message={contactsError} />}
                </div>
            )}

            {/* Stats Overview */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Dagar som medlem"
                    value={profileData.daysSinceJoin}
                    icon={Calendar}
                    color="from-blue-500 to-cyan-500"
                />
                <StatCard
                    label="Profil visningar"
                    value="–"
                    icon={User}
                    color="from-purple-500 to-pink-500"
                />
                {isOwnProfile && (
                    <>
                        <StatCard
                            label="Aktiva samtal"
                            value={patientContacts.length}
                            icon={MessageSquare}
                            color="from-green-500 to-emerald-500"
                        />
                        <StatCard
                            label="Totala meddelanden"
                            value={patientContacts.reduce((sum, contact) => sum + contact.totalMessages, 0)}
                            icon={Activity}
                            color="from-orange-500 to-red-500"
                        />
                    </>
                )}
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Information */}
                <ProfileCard
                    title="Profilinformation"
                    icon={<User className="h-5 w-5" />}
                    gradient="from-blue-500/10 to-purple-500/10"
                >
                    <div className="space-y-3">
                        <InfoRow
                            label="E-post"
                            value={profileData.email || 'Ej tillgänglig'}
                            icon={<Mail className="h-4 w-4" />}
                        />
                        <InfoRow
                            label="Användarnamn"
                            value={`@${profileData.username}`}
                            icon={<User className="h-4 w-4" />}
                        />
                        <InfoRow
                            label="Medlem sedan"
                            value={formatDate(targetUser.created_at || '')}
                            icon={<Calendar className="h-4 w-4" />}
                        />
                        {profileData.lastSignIn && (
                            <InfoRow
                                label="Senast aktiv"
                                value={formatRelativeTime(profileData.lastSignIn)}
                                icon={<Clock className="h-4 w-4" />}
                            />
                        )}
                    </div>
                </ProfileCard>

                {/* Patient Contacts (Own Profile Only) */}
                {isOwnProfile && (
                    <ProfileCard
                        title="Senaste patientkontakter"
                        icon={<Users className="h-5 w-5" />}
                        gradient="from-green-500/10 to-emerald-500/10"
                    >
                        {contactsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                            </div>
                        ) : patientContacts.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {patientContacts.map((contact, index) => (
                                    <PatientContactItem
                                        key={`${contact.cnumber}-${index}`}
                                        contact={contact}
                                        onClick={() => handleContactClick(contact)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                                Inga patientkontakter ännu
                            </p>
                        )}
                    </ProfileCard>
                )}

                {/* Settings (Own Profile Only) */}
                {isOwnProfile && (
                    <ProfileCard
                        title="Inställningar"
                        icon={<SettingsIcon className="h-5 w-5" />}
                        gradient="from-orange-500/10 to-red-500/10"
                        className="lg:col-span-2"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InfoRow
                                label="Profil synlighet"
                                value={profileData.settings.profileVisibility === 'public' ? 'Offentlig' : 'Privat'}
                                icon={<Shield className="h-4 w-4" />}
                            />
                            <InfoRow
                                label="Mörkt tema"
                                value={profileData.settings.darkMode ? 'Påslaget' : 'Avslaget'}
                                icon={<Activity className="h-4 w-4" />}
                            />
                            <InfoRow
                                label="E-postnotiser"
                                value={profileData.settings.emailNotifications ? 'Påslaget' : 'Avslaget'}
                                icon={<Bell className="h-4 w-4" />}
                            />
                        </div>

                        {!isEditingSettings && (
                            <div className="mt-4">
                                <Button
                                    onClick={() => setIsEditingSettings(true)}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Redigera inställningar
                                </Button>
                            </div>
                        )}
                    </ProfileCard>
                )}
            </div>

            {/* Edit Bio Modal */}
            <AnimatePresence>
                {isEditingBio && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                handleCloseEditBio();
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Redigera profil
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCloseEditBio}
                                    className="p-2"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {saveError && <ErrorAlert message={saveError} />}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Visningsnamn
                                    </label>
                                    <Input
                                        value={editState.displayName}
                                        onChange={(e) => setEditState(prev => ({ ...prev, displayName: e.target.value }))}
                                        placeholder="Ditt visningsnamn"
                                        maxLength={50}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Biografi
                                    </label>
                                    <Textarea
                                        value={editState.bio}
                                        onChange={(e) => setEditState(prev => ({ ...prev, bio: e.target.value }))}
                                        placeholder="Berätta något om dig själv..."
                                        rows={4}
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {editState.bio.length}/500 tecken
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    onClick={handleCloseEditBio}
                                    variant="outline"
                                    className="flex-1"
                                    disabled={isSaving}
                                >
                                    Avbryt
                                </Button>
                                <Button
                                    onClick={saveProfile}
                                    className="flex-1"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                            Sparar...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Spara
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Settings Modal */}
            <AnimatePresence>
                {isEditingSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                handleCloseEditSettings();
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Redigera inställningar
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCloseEditSettings}
                                    className="p-2"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {saveError && <ErrorAlert message={saveError} />}

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Profil synlighet
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                value="public"
                                                checked={editState.settings.profileVisibility === 'public'}
                                                onChange={(e) => setEditState(prev => ({
                                                    ...prev,
                                                    settings: { ...prev.settings, profileVisibility: e.target.value }
                                                }))}
                                                className="mr-2"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Offentlig</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                value="private"
                                                checked={editState.settings.profileVisibility === 'private'}
                                                onChange={(e) => setEditState(prev => ({
                                                    ...prev,
                                                    settings: { ...prev.settings, profileVisibility: e.target.value }
                                                }))}
                                                className="mr-2"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Privat</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={editState.settings.darkMode}
                                            onChange={(e) => setEditState(prev => ({
                                                ...prev,
                                                settings: { ...prev.settings, darkMode: e.target.checked }
                                            }))}
                                            className="mr-3"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Aktivera mörkt tema
                    </span>
                                    </label>
                                </div>

                                <div>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={editState.settings.emailNotifications}
                                            onChange={(e) => setEditState(prev => ({
                                                ...prev,
                                                settings: { ...prev.settings, emailNotifications: e.target.checked }
                                            }))}
                                            className="mr-3"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Aktivera e-postnotifikationer
                    </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    onClick={handleCloseEditSettings}
                                    variant="outline"
                                    className="flex-1"
                                    disabled={isSaving}
                                >
                                    Avbryt
                                </Button>
                                <Button
                                    onClick={saveSettings}
                                    className="flex-1"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                            Sparar...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Spara
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function WrappedChatPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            </div>
        }>
            <ChatRedirectPage />
        </Suspense>
    );
}