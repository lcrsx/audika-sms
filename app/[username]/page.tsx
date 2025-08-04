'use client';

import { useEffect, useState, useCallback } from "react";
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
  Users
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React from "react";
import { AvatarRefreshButton } from '@/components/avatar-refresh-button'
import { generatePatientAvatar } from '@/lib/avatar-utils'
import { LucideIcon } from 'lucide-react';

// Type definitions
interface AppUser {
  id: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  email?: string;
  created_at: string;
  updated_at?: string;
  profile_visibility?: string;
  dark_mode?: boolean;
  email_notifications?: boolean;
  user_metadata?: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    role?: string;
    settings?: Record<string, unknown>;
    [key: string]: unknown;
  };
  last_sign_in_at?: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

interface InfoRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
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
  return new Date(dateString).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

// ===========================
// COMPONENTS
// ===========================

function ProfileCard({
                       title,
                       icon,
                       children,
                       className = '',
                       gradient = 'from-blue-500/10 to-purple-500/10'
                     }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}) {
  return (
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
  );
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
      <div className="text-center p-4 rounded-xl bg-white/30 dark:bg-black/30 hover:bg-white/40 dark:hover:bg-black/40 transition-all duration-300">
        <div className={`mx-auto mb-2 p-2 rounded-lg bg-gradient-to-br ${color} w-fit`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      </div>
  );
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-300">
        <div className="flex items-center gap-3">
          {icon && <div className="text-gray-600 dark:text-gray-400">{icon}</div>}
          <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-right">{value}</span>
      </div>
  );
}

interface PatientContactItemProps {
  cnumber: string;
  name?: string;
  lastContact: string;
  totalMessages: number;
  phone?: string;
}

function PatientContactItem({
                              cnumber,
                              name,
                              lastContact,
                              totalMessages,
                              phone
                            }: PatientContactItemProps) {
  // Generate professional avatar for patient using cnumber for consistency
  const patientAvatar = generatePatientAvatar(cnumber)
  
  return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-300 group cursor-pointer">
        <Avatar className="h-10 w-10">
          <AvatarImage src={patientAvatar} alt={name || `Patient ${cnumber}`} />
          <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-sm font-medium">
            {getInitials(cnumber)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {name || `Patient ${cnumber}`}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {totalMessages} meddelanden • {lastContact}
          </p>
          {phone && (
              <p className="text-xs text-gray-500 dark:text-gray-500">{phone}</p>
          )}
        </div>

        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md group-hover:scale-110 transition-transform duration-300">
          <MessageSquare className="h-4 w-4" />
        </div>

        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300" />
      </div>
  );
}

// ===========================
// MAIN COMPONENT
// ===========================

export default function UserProfilePage({
                                          params
                                        }: {
  params: Promise<{ username: string }>;
}) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Edit states
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSettings, setEditSettings] = useState({
    profileVisibility: 'public',
    darkMode: false,
    emailNotifications: true
  });
  const [isSaving, setIsSaving] = useState(false);

  // Patient contacts
  const [patientContacts, setPatientContacts] = useState<PatientContactItemProps[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Load patient contacts for own profile
  const loadPatientContacts = useCallback(async () => {
    if (!isOwnProfile || !user) return;

    setContactsLoading(true);
    try {
      const supabase = createClient();

      // Get recent SMS messages sent by this user
      const { data: messages, error } = await supabase
          .from('messages')
          .select('patient_cnumber, recipient_phone, created_at, content, sender_tag')
          .eq('sender_tag', user.email?.split('@')[0]?.toUpperCase())
          .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by patient and get stats
      const patientStats = new Map();

      interface MessageData {
        patient_cnumber?: string;
        recipient_phone?: string;
        created_at: string;
        sender_tag?: string;
      }

      messages?.forEach((msg: MessageData) => {
        const key = msg.patient_cnumber || msg.recipient_phone;
        if (!patientStats.has(key)) {
          patientStats.set(key, {
            cnumber: msg.patient_cnumber || 'PHONE',
            phone: msg.recipient_phone,
            lastContact: msg.created_at,
            totalMessages: 0,
            name: null // Would come from patient database
          });
        }
        patientStats.get(key).totalMessages++;
      });

      // Convert to array and sort by last contact
      const contacts = Array.from(patientStats.values())
          .sort((a: PatientContactItemProps, b: PatientContactItemProps) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime())
          .slice(0, 10); // Show last 10

      setPatientContacts(contacts);
    } catch (error) {
      console.error('Error loading patient contacts:', error);
    } finally {
      setContactsLoading(false);
    }
  }, [isOwnProfile, user]);

  // Save profile changes
  const saveProfile = async () => {
    if (!user || !isOwnProfile) return;

    setIsSaving(true);
    try {
      const supabase = createClient();

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          display_name: editDisplayName,
          bio: editBio
        }
      });

      if (authError) throw authError;

      // Update database user record
      const { error: dbError } = await supabase
        .from('users')
        .update({
          display_name: editDisplayName,
          bio: editBio
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // Update local state
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          display_name: editDisplayName,
          bio: editBio
        }
      });

      if (targetUser) {
        setTargetUser({
          ...targetUser,
          user_metadata: {
            ...targetUser.user_metadata,
            display_name: editDisplayName,
            bio: editBio
          }
        });
      }

      setIsEditingBio(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Kunde inte spara profilen. Försök igen.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save settings changes
  const saveSettings = async () => {
    if (!user || !isOwnProfile) return;

    setIsSaving(true);
    try {
      const supabase = createClient();

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          settings: editSettings
        }
      });

      if (authError) throw authError;

      // Update database user record
      const { error: dbError } = await supabase
        .from('users')
        .update({
          profile_visibility: editSettings.profileVisibility,
          dark_mode: editSettings.darkMode,
          email_notifications: editSettings.emailNotifications
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // Update local state
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          settings: editSettings
        }
      });

      if (targetUser) {
        setTargetUser({
          ...targetUser,
          user_metadata: {
            ...targetUser.user_metadata,
            settings: editSettings
          }
        });
      }

      setIsEditingSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Kunde inte spara inställningarna. Försök igen.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        const resolvedParams = await params;

        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          window.location.href = '/auth/login';
          return;
        }

        const currentUsername = data.user.email?.split('@')[0]?.toUpperCase();
        const requestedUsername = resolvedParams.username.toUpperCase();
        const isOwn = currentUsername === requestedUsername;

        setUser(data.user);
        setIsOwnProfile(isOwn);

        if (isOwn) {
          setTargetUser(data.user);
          setEditDisplayName(data.user.user_metadata?.display_name || '');
          setEditBio(data.user.user_metadata?.bio || '');
          setEditSettings({
            profileVisibility: data.user.user_metadata?.settings?.profileVisibility || 'public',
            darkMode: data.user.user_metadata?.settings?.darkMode || false,
            emailNotifications: data.user.user_metadata?.settings?.emailNotifications || true
          });
        } else {
          // Get real user data from database
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('username', requestedUsername)
            .single();

          if (userError || !userData) {
            // User doesn't exist in database
            console.log('User not found in database:', requestedUsername);
            window.location.href = '/hem';
            return;
          }

          // Check if user profile is private
          if (userData.profile_visibility === 'private') {
            window.location.href = '/hem';
            return;
          }

          // Create user object from database data
          const targetUserData = {
            id: userData.id,
            email: userData.email,
            user_metadata: {
              display_name: userData.display_name || userData.username,
              bio: userData.bio || '',
              settings: {
                profileVisibility: userData.profile_visibility || 'public',
                darkMode: userData.dark_mode || false,
                emailNotifications: userData.email_notifications || true
              }
            },
            created_at: userData.created_at,
            last_sign_in_at: userData.last_sign_in_at
          };

          setTargetUser(targetUserData);
        }
      } catch {
        // Error handled by redirect
        window.location.href = '/auth/login';
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  // Load patient contacts when profile loads
  useEffect(() => {
    if (!loading && isOwnProfile) {
      loadPatientContacts();
    }
  }, [loading, isOwnProfile, loadPatientContacts]);

  if (loading) {
    return (
        <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  if (!user || !targetUser) {
    return null;
  }

  const { email, created_at, last_sign_in_at, user_metadata } = targetUser;
  const username = email?.split('@')[0]?.toUpperCase();
  const displayName = user_metadata?.display_name || username;
  const bio = user_metadata?.bio || '';
  const avatarUrl = user_metadata?.avatar_url;
  const settings = user_metadata?.settings || {};

  const memberSince = new Date(created_at || '').getFullYear();
  const daysSinceJoin = Math.floor((Date.now() - new Date(created_at || '').getTime()) / (1000 * 60 * 60 * 24));

  return (
      <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8 relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-visible pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-rose-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Hero Profile Section */}
          <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-lg"
          >
            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse rounded-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              {/* Profile Avatar */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 blur-2xl opacity-50 scale-110 animate-pulse" />
                <Avatar className="relative h-32 w-32 border-4 border-white/50 dark:border-white/20 shadow-2xl">
                  {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={displayName} />
                  ) : (
                      <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {getInitials(displayName || 'User')}
                      </AvatarFallback>
                  )}
                </Avatar>

                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center ring-4 ring-white dark:ring-gray-900 shadow-lg">
                  <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                </div>

                {/* Avatar Refresh Button - Only show for own profile */}
                {isOwnProfile && (
                  <div className="absolute -bottom-2 -left-2">
                    <AvatarRefreshButton 
                      onAvatarChange={(newAvatarUrl) => {
                        // Update local state to reflect the new avatar
                        setUser({
                          ...user,
                          user_metadata: {
                            ...user.user_metadata,
                            avatar_url: newAvatarUrl
                          }
                        })
                        if (targetUser) {
                          setTargetUser({
                            ...targetUser,
                            user_metadata: {
                              ...targetUser.user_metadata,
                              avatar_url: newAvatarUrl
                            }
                          });
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-4 justify-center md:justify-start mb-4">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    {displayName}
                  </h1>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                    {isOwnProfile ? 'Online' : 'Offentlig'}
                  </Badge>
                  {isOwnProfile && (
                      <Button
                          onClick={() => setIsEditingBio(true)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                  )}
                </div>

                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                  @{username}
                </p>

                <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                  {isOwnProfile ?
                      (bio || 'Audika SMS Tjänst - Kommunikation som fungerar') :
                      (bio || `${displayName} använder Audika SMS Tjänst`)
                  }
                </p>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                      label="Medlem sedan"
                      value={memberSince}
                      icon={Calendar}
                      color="from-blue-500 to-cyan-500"
                  />
                  <StatCard
                      label={isOwnProfile ? "Aktiva dagar" : "Medlem"}
                      value={isOwnProfile ? daysSinceJoin : `${daysSinceJoin}d`}
                      icon={Activity}
                      color="from-green-500 to-emerald-500"
                  />
                  <StatCard
                      label="Patienter"
                      value={isOwnProfile ? patientContacts.length : "—"}
                      icon={Users}
                      color="from-purple-500 to-pink-500"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Edit Profile Modal */}
          <AnimatePresence>
            {isEditingBio && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setIsEditingBio(false)}
                >
                  <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-w-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Redigera profil</h3>
                      <Button
                          onClick={() => setIsEditingBio(false)}
                          variant="ghost"
                          size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Visningsnamn</label>
                        <Input
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            placeholder="Ditt visningsnamn"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Bio</label>
                        <Textarea
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
                            placeholder="Berätta om dig själv..."
                            rows={3}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                      <Button
                          onClick={() => setIsEditingBio(false)}
                          variant="outline"
                          disabled={isSaving}
                      >
                        Avbryt
                      </Button>
                      <Button
                          onClick={saveProfile}
                          disabled={isSaving}
                      >
                        {isSaving ? (
                            <>Sparar...</>
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
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setIsEditingSettings(false)}
                >
                  <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-w-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Redigera inställningar</h3>
                      <Button
                          onClick={() => setIsEditingSettings(false)}
                          variant="ghost"
                          size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {/* Profile Visibility */}
                      <div>
                        <label className="text-sm font-medium mb-3 block">Profilsynlighet</label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                              variant={editSettings.profileVisibility === 'public' ? 'default' : 'outline'}
                              onClick={() => setEditSettings(prev => ({ ...prev, profileVisibility: 'public' }))}
                              className="h-10"
                          >
                            Offentlig
                          </Button>
                          <Button
                              variant={editSettings.profileVisibility === 'private' ? 'default' : 'outline'}
                              onClick={() => setEditSettings(prev => ({ ...prev, profileVisibility: 'private' }))}
                              className="h-10"
                          >
                            Privat
                          </Button>
                        </div>
                      </div>

                      {/* Dark Mode */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Mörkt läge</label>
                        <Button
                            variant={editSettings.darkMode ? 'default' : 'outline'}
                            onClick={() => setEditSettings(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                            size="sm"
                        >
                          {editSettings.darkMode ? 'På' : 'Av'}
                        </Button>
                      </div>

                      {/* Email Notifications */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">E-postnotifikationer</label>
                        <Button
                            variant={editSettings.emailNotifications ? 'default' : 'outline'}
                            onClick={() => setEditSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                            size="sm"
                        >
                          {editSettings.emailNotifications ? 'På' : 'Av'}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                      <Button
                          onClick={() => setIsEditingSettings(false)}
                          variant="outline"
                          disabled={isSaving}
                      >
                        Avbryt
                      </Button>
                      <Button
                          onClick={saveSettings}
                          disabled={isSaving}
                      >
                        {isSaving ? (
                            <>Sparar...</>
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

          {/* Recent Patient Contacts - Only show for own profile */}
          {isOwnProfile && (
              <ProfileCard
                  title="Senast Kontaktade Patienter"
                  icon={<MessageSquare className="w-5 h-5" />}
                  gradient="from-green-500/10 to-emerald-500/10"
              >
                {contactsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Laddar kontakter...</p>
                    </div>
                ) : patientContacts.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {patientContacts.map((contact: PatientContactItemProps) => (
                            <PatientContactItem
                                key={contact.cnumber + contact.phone}
                                cnumber={contact.cnumber}
                                name={contact.name}
                                lastContact={formatRelativeTime(contact.lastContact)}
                                totalMessages={contact.totalMessages}
                                phone={contact.phone}
                            />
                        ))}
                      </div>

                      <Button
                          onClick={() => window.location.href = '/sms'}
                          className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Skicka SMS till patient
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </>
                ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        Inga kontakter än
                      </h3>
                      <p className="text-gray-500 dark:text-gray-500 mb-4">
                        Skicka ditt första SMS för att se kontakter här
                      </p>
                      <Button
                          onClick={() => window.location.href = '/sms'}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      >
                        Skicka SMS
                      </Button>
                    </div>
                )}
              </ProfileCard>
          )}

          {/* Public Activity Section - Show for other users */}
          {!isOwnProfile && (
              <ProfileCard
                  title="Offentlig Aktivitet"
                  icon={<Activity className="w-5 h-5" />}
                  gradient="from-blue-500/10 to-cyan-500/10"
              >
                <div className="text-center py-8">
                  <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Denna användare har en offentlig profil
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    {displayName} är medlem i Audika SMS Tjänst
                  </p>
                </div>

                <Button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Skicka meddelande
                </Button>
              </ProfileCard>
          )}

          {/* Account & Activity Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Account Details */}
            <ProfileCard
                title="Kontoinformation"
                icon={<User className="w-5 h-5" />}
                gradient="from-blue-500/10 to-cyan-500/10"
            >
              <div className="space-y-3">
                <InfoRow
                    label="E-post"
                    value={isOwnProfile ? (email || 'Ej angivet') : 'Dold för integritet'}
                    icon={<Mail className="h-4 w-4" />}
                />
                <InfoRow
                    label="Användarnamn"
                    value={username || 'Ej angivet'}
                    icon={<User className="h-4 w-4" />}
                />
                <InfoRow
                    label="Konto skapat"
                    value={formatDate(created_at || '')}
                    icon={<Calendar className="h-4 w-4" />}
                />
                {isOwnProfile && (
                    <InfoRow
                        label="Senaste inloggning"
                        value={last_sign_in_at ? formatRelativeTime(last_sign_in_at) : 'Aldrig'}
                        icon={<Clock className="h-4 w-4" />}
                    />
                )}
              </div>
            </ProfileCard>

            {/* Activity & Security */}
            <ProfileCard
                title="Aktivitet & Säkerhet"
                icon={<Shield className="w-5 h-5" />}
                gradient="from-purple-500/10 to-violet-500/10"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/20 dark:bg-black/20">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Status</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    Online
                  </div>
                </div>

                <InfoRow
                    label="Säkerhetsnivå"
                    value="Hög"
                    icon={<Shield className="h-4 w-4" />}
                />
                <InfoRow
                    label="E-postverifiering"
                    value={
                      <Badge className={user_metadata?.email_verified ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                        {user_metadata?.email_verified ? "Verifierad" : "Ej verifierad"}
                      </Badge>
                    }
                    icon={<Mail className="h-4 w-4" />}
                />
                {isOwnProfile && (
                    <InfoRow
                        label="Notifikationer"
                        value={
                          <Badge className={settings?.emailNotifications ? "bg-green-500 text-white" : "bg-gray-500 text-white"}>
                            {settings?.emailNotifications ? "Aktiverade" : "Inaktiverade"}
                          </Badge>
                        }
                        icon={<Bell className="h-4 w-4" />}
                    />
                )}
              </div>
            </ProfileCard>
          </div>

          {/* Settings Overview - Only show for own profile */}
          {isOwnProfile && (
              <ProfileCard
                  title="Inställningar"
                  icon={<SettingsIcon className="w-5 h-5" />}
                  gradient="from-orange-500/10 to-red-500/10"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-white/20 dark:bg-black/20">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Profilsynlighet
                    </div>
                    <Badge className={settings?.profileVisibility === 'public' ? "bg-green-500 text-white" : "bg-blue-500 text-white"}>
                      {settings?.profileVisibility === 'public' ? 'Offentlig' : 'Privat'}
                    </Badge>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/20 dark:bg-black/20">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Mörkt läge
                    </div>
                    <Badge className={settings?.darkMode ? "bg-gray-800 text-white" : "bg-yellow-500 text-white"}>
                      {settings?.darkMode ? 'Aktiverat' : 'Inaktiverat'}
                    </Badge>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/20 dark:bg-black/20">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      E-postnotiser
                    </div>
                    <Badge className={settings?.emailNotifications ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                      {settings?.emailNotifications ? 'På' : 'Av'}
                    </Badge>
                  </div>
                </div>

                <Button
                    onClick={() => setIsEditingSettings(true)}
                    className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Redigera inställningar
                </Button>
              </ProfileCard>
          )}

          {/* Debug Section - Only show for own profile */}
          {isOwnProfile && (
              <ProfileCard
                  title="Debug Information"
                  icon={<SettingsIcon className="w-5 h-5" />}
                  gradient="from-red-500/10 to-pink-500/10"
              >
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/20 dark:bg-black/20">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">User Claims:</h4>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(user, null, 2)}
                    </pre>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white/20 dark:bg-black/20">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Target User Claims:</h4>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(targetUser, null, 2)}
                    </pre>
                  </div>
                </div>
              </ProfileCard>
          )}
        </div>
      </div>
  );
}