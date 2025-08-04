'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getAllRecentMessages, getMessageStats } from '@/lib/actions/messages';
import { formatForDisplay } from '@/lib/actions/swe-format';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { generatePatientAvatar } from '@/lib/avatar-utils';
import {
  MessageSquare,
  Send,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Activity,
  Phone,
  Star,
  ArrowUp,
  Loader2,
  Search,
  Eye,
  RefreshCw,
  Target,
  Gauge,
  Download,
  X,
  Monitor,
  MapPin,
  MessageCircle,
  ChevronRight,
  Copy,
  CheckCircle,
  UserCheck,
  UserX,
  Trash2,
  Edit,
  Save,
  Sparkles,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
interface Message {
  id: string;
  content: string;
  created_at: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  patient_cnumber: string;
  recipient_phone: string;
  sender_tag: string;
  patients?: {
    cnumber: string;
  } | null;
  message_templates?: {
    name: string;
  };
}

interface Patient {
  id: string;
  cnumber: string;
  city: string | null;
  created_at: string;
  created_by: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  internal_notes: string | null;
  is_active: boolean;
  last_contact_at: string | null;
  updated_at: string;
  patient_phones: Array<{
    id: string;
    phone: string;
    label: string;
    patient_id: string;
  }>;
  total_messages?: number;
  last_message_status?: 'pending' | 'sent' | 'delivered' | 'failed';
  last_message_content?: string;
  last_message_sender?: string;
  last_message_at?: string;
}

interface DashboardStats {
  totalMessages: number;
  sentToday: number;
  activeSessions: number;
  activePatients: number;
  pendingMessages: number;
  failedMessages: number;
  topSender: string;
}

interface ApiStats {
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  successRate: number;
  userTotalToday: number;
}

// Utility functions

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'text-green-600 bg-green-100';
    case 'sent':
      return 'text-blue-600 bg-blue-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'failed':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'sent':
      return <Send className="w-4 h-4" />;
    case 'pending':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

// Stat Card Component
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient = "from-blue-500 to-purple-600",
  onClick
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: string;
  gradient?: string;
  onClick?: () => void;
}) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -5 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group`}
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-sm text-green-200">
            <ArrowUp className="w-4 h-4" />
            {trend}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-3xl font-bold">{value}</h3>
        <p className="text-white/80 font-medium">{title}</p>
        {subtitle && <p className="text-white/60 text-sm">{subtitle}</p>}
      </div>
    </div>

    {/* Decorative elements */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 -translate-y-8 group-hover:scale-110 transition-transform duration-500" />
    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full transform -translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-500" />
  </motion.div>
);

// Message Card Component
const MessageCard = ({ 
  message, 
  onView, 
  onRetry 
}: {
  message: Message;
  onView?: (message: Message) => void;
  onRetry?: (message: Message) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    whileHover={{ y: -2 }}
    className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:bg-white/90 dark:hover:bg-gray-900/90 transition-all duration-300 group"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm">
            {message.sender_tag[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-white">
            {message.patients?.cnumber ? `Patient ${message.patients.cnumber}` : 'Okänd patient'}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{message.sender_tag}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge className={`${getStatusColor(message.status)} flex items-center gap-1`}>
          {getStatusIcon(message.status)}
          {message.status}
        </Badge>
      </div>
    </div>

    <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed">
      {message.content}
    </p>

    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Phone className="w-4 h-4" />
          {formatForDisplay(message.recipient_phone)}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {formatRelativeTime(message.created_at)}
        </div>
      </div>

      <div className="flex gap-2">
        {onView && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(message)}
            className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-200 dark:hover:border-purple-700"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
        {message.status === 'failed' && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRetry(message)}
            className="p-2 text-orange-600 border-orange-200"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  </motion.div>
);

// Main Dashboard Component
export default function SMSDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [topSenders, setTopSenders] = useState<Array<{sender: string, count: number}>>([]);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [recentChatMessages, setRecentChatMessages] = useState<Array<{
    id: string;
    content: string;
    username: string;
    created_at: string;
  }>>([]);
  const [systemEvents, setSystemEvents] = useState<Array<{
    id: string;
    type: 'sms_delivered' | 'sms_sent' | 'sms_failed' | 'patient_created' | 'user_registered' | 'template_updated';
    message: string;
    timestamp: string;
    color: string;
  }>>([]);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // Calculate top senders from messages
  const calculateTopSenders = useCallback((messages: Message[]) => {
    const senderCounts: { [key: string]: number } = {};
    
    messages.forEach(message => {
      const sender = message.sender_tag;
      senderCounts[sender] = (senderCounts[sender] || 0) + 1;
    });

    return Object.entries(senderCounts)
      .map(([sender, count]) => ({ sender, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, []);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Load recent messages
      const messagesResult = await getAllRecentMessages(20);
      if (messagesResult.success) {
        const messagesData = messagesResult.messages || [];
        setMessages(messagesData);
        setTopSenders(calculateTopSenders(messagesData));
        
        // Load stats
        const statsResult = await getMessageStats();
        if (statsResult.success && statsResult.stats) {
          const apiStats = statsResult.stats;
                  // Get real patient data for active patients
        const supabaseClient = createClient();
        const { data: patientsData } = await supabaseClient
          .from('patients')
          .select('id, is_active, last_contact_at')
          .eq('is_active', true);

        // Calculate active patients (patients contacted in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activePatients = (patientsData || []).filter((patient: any) => {
          if (!patient.last_contact_at) return false;
          return new Date(patient.last_contact_at) >= thirtyDaysAgo;
        }).length;

        // Get active sessions (users who sent messages today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todayMessages } = await supabaseClient
          .from('messages')
          .select('sender_id')
          .gte('created_at', today.toISOString());

        const uniqueSenders = new Set((todayMessages || []).map((m: any) => m.sender_id));
        const activeSessions = uniqueSenders.size;

        setStats({
          totalMessages: messagesData.length,
          sentToday: apiStats.totalToday || 0,
          activeSessions: activeSessions,
          activePatients: activePatients,
          pendingMessages: messagesData.filter((m: Message) => m.status === 'pending').length,
          failedMessages: messagesData.filter((m: Message) => m.status === 'failed').length,
          topSender: topSenders.length > 0 ? topSenders[0].sender : currentUser?.email?.split('@')[0]?.toUpperCase() || 'USER'
        });
        } else {
          console.warn('Kunde inte ladda statistik:', statsResult.error);
          
          // Get real data even if API stats fail
          const supabaseClient = createClient();
          const { data: patientsData } = await supabaseClient
            .from('patients')
            .select('id, is_active, last_contact_at')
            .eq('is_active', true);

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const activePatients = (patientsData || []).filter((patient: any) => {
            if (!patient.last_contact_at) return false;
            return new Date(patient.last_contact_at) >= thirtyDaysAgo;
          }).length;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const { data: todayMessages } = await supabaseClient
            .from('messages')
            .select('sender_id')
            .gte('created_at', today.toISOString());

          const uniqueSenders = new Set((todayMessages || []).map((m: any) => m.sender_id));
          const activeSessions = uniqueSenders.size;

          // Set default stats if API fails
          setStats({
            totalMessages: messagesData.length,
            sentToday: 0,
            activeSessions: activeSessions,
            activePatients: activePatients,
            pendingMessages: messagesData.filter((m: Message) => m.status === 'pending').length,
            failedMessages: messagesData.filter((m: Message) => m.status === 'failed').length,
            topSender: topSenders.length > 0 ? topSenders[0].sender : currentUser?.email?.split('@')[0]?.toUpperCase() || 'USER'
          });
        }
      } else {
        throw new Error(messagesResult.error || 'Kunde inte ladda meddelanden');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Kunde inte ladda dashboard data');
    } finally {
      setLoading(false);
    }
  }, [currentUser, calculateTopSenders]);

  // Load recent chat messages
  const loadRecentChatMessages = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: chatMessages, error } = await supabase
        .from('chat')
        .select('id, content, username, created_at')
        .eq('room_name', 'global')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading chat messages:', error);
        return;
      }

      setRecentChatMessages(chatMessages || []);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  }, []);

  // Load real system events
  const loadSystemEvents = useCallback(async () => {
    try {
      const supabase = createClient();
      const events: Array<{
        id: string;
        type: 'sms_delivered' | 'sms_sent' | 'sms_failed' | 'patient_created' | 'user_registered' | 'template_updated';
        message: string;
        timestamp: string;
        color: string;
      }> = [];

      // Get recent SMS messages with status changes
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id, status, recipient_phone, created_at, sender_display_name')
        .order('created_at', { ascending: false })
        .limit(15);

      if (recentMessages) {
        recentMessages.forEach((msg) => {
          if (msg.status === 'delivered') {
            events.push({
              id: `sms-${msg.id}`,
              type: 'sms_delivered',
              message: `SMS levererat till ${msg.recipient_phone}`,
              timestamp: msg.created_at,
              color: 'bg-green-500'
            });
          } else if (msg.status === 'sent') {
            events.push({
              id: `sms-${msg.id}`,
              type: 'sms_sent',
              message: `SMS skickat av ${msg.sender_display_name || 'Användare'}`,
              timestamp: msg.created_at,
              color: 'bg-blue-500'
            });
          } else if (msg.status === 'failed') {
            events.push({
              id: `sms-${msg.id}`,
              type: 'sms_failed',
              message: `SMS misslyckat till ${msg.recipient_phone}`,
              timestamp: msg.created_at,
              color: 'bg-red-500'
            });
          }
        });
      }

      // Get recent patient creations
      const { data: recentPatients } = await supabase
        .from('patients')
        .select('id, cnumber, created_at, city')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentPatients) {
        recentPatients.forEach((patient) => {
          events.push({
            id: `patient-${patient.id}`,
            type: 'patient_created',
            message: `Ny patient tillagd: ${patient.cnumber}`,
            timestamp: patient.created_at,
            color: 'bg-purple-500'
          });
        });
      }

      // Get recent user registrations (if you have a users table)
      const { data: recentUsers } = await supabase
        .from('users')
        .select('id, username, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentUsers) {
        recentUsers.forEach((user) => {
          events.push({
            id: `user-${user.id}`,
            type: 'user_registered',
            message: `Ny användare registrerad: ${user.username}`,
            timestamp: user.created_at,
            color: 'bg-pink-500'
          });
        });
      }

      // Get recent message template updates
      const { data: recentTemplates } = await supabase
        .from('message_templates')
        .select('id, name, updated_at')
        .order('updated_at', { ascending: false })
        .limit(3);

      if (recentTemplates) {
        recentTemplates.forEach((template) => {
          events.push({
            id: `template-${template.id}`,
            type: 'template_updated',
            message: `SMS-mall uppdaterad: ${template.name}`,
            timestamp: template.updated_at || template.id, // fallback
            color: 'bg-orange-500'
          });
        });
      }

      // Sort all events by timestamp and take the most recent 10
      const sortedEvents = events
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      setSystemEvents(sortedEvents);
    } catch (error) {
      console.error('Error loading system events:', error);
    }
  }, []);

  // Load data on mount and when user changes
  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
      loadRecentChatMessages();
      loadSystemEvents();
    }
  }, [currentUser, loadDashboardData, loadRecentChatMessages, loadSystemEvents]);

  // Filter messages
  const filteredMessages = messages.filter(message => {
    const matchesSearch =
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.patients?.cnumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.recipient_phone.includes(searchQuery) ||
      message.sender_tag.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleViewMessage = async (message: Message) => {
    if (!message.patients?.cnumber) {
      toast.error('Ingen patient kopplad till detta meddelande');
      return;
    }

    try {
      const supabase = createClient();
      
      // Get patient data
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select(`
          *,
          patient_phones(*)
        `)
        .eq('cnumber', message.patients.cnumber)
        .single();

      if (patientError || !patientData) {
        toast.error('Kunde inte hitta patientdata');
        return;
      }

      // Get message count and last message info
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('patient_cnumber', message.patients.cnumber);

      const { data: lastMessage } = await supabase
        .from('messages')
        .select('status, content, sender_display_name, created_at')
        .eq('patient_cnumber', message.patients.cnumber)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const patientWithMessages: Patient = {
        ...patientData,
        total_messages: messageCount || 0,
        last_message_status: lastMessage?.status || null,
        last_message_content: lastMessage?.content || null,
        last_message_sender: lastMessage?.sender_display_name || null,
        last_message_at: lastMessage?.created_at || null
      };

      setViewingPatient(patientWithMessages);
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('Kunde inte ladda patientdata');
    }
  };

  const handleRetryMessage = (message: Message) => {
    console.log('Retry message:', message);
  };

  // Copy to clipboard with enhanced feedback
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast.success(`${label} kopierat!`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (_error) {
      toast.error(`Kunde inte kopiera ${label.toLowerCase()}`);
    }
  };

  // Utility functions for patient details
  const getInitials = (name: string): string => {
    if (!name) return 'P';
    return name
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2) || 'P';
  };

  const getStatusBadge = (patient: Patient) => {
    if (!patient.is_active) {
      return <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs">Inaktiv</Badge>;
    }
    
    if (patient.last_contact_at) {
      const lastContact = new Date(patient.last_contact_at);
      const daysSince = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince <= 7) {
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Aktiv</Badge>;
      } else if (daysSince <= 30) {
        return <Badge variant="outline" className="border-yellow-300 text-yellow-700 dark:border-yellow-600 dark:text-yellow-400 text-xs">Månad</Badge>;
      } else {
        return <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400 text-xs">Gammal</Badge>;
      }
    }
    
    return <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400 text-xs">Ny</Badge>;
  };

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'sent':
        return <MessageCircle className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      default:
        return <MessageSquare className="w-3 h-3 text-gray-400" />;
    }
  };

  // View Patient Dialog Component
  const ViewPatientDialog = () => {
    if (!viewingPatient) return null;

    return (
      <Dialog open={!!viewingPatient} onOpenChange={() => setViewingPatient(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Patientdetaljer - {viewingPatient.cnumber}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">CNummer</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{viewingPatient.cnumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                <div className="mt-1">
                  {getStatusBadge(viewingPatient)}
                </div>
              </div>
              {viewingPatient.city && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stad</label>
                  <p className="text-gray-900 dark:text-white">{viewingPatient.city}</p>
                </div>
              )}
              {viewingPatient.gender && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Kön</label>
                  <p className="text-gray-900 dark:text-white">
                    {viewingPatient.gender === 'male' ? 'Man' : 
                     viewingPatient.gender === 'female' ? 'Kvinna' : 'Annat'}
                  </p>
                </div>
              )}
              {viewingPatient.date_of_birth && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Födelsedatum</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(viewingPatient.date_of_birth).toLocaleDateString('sv-SE')}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Skapad</label>
                <p className="text-gray-900 dark:text-white">
                  {formatRelativeTime(viewingPatient.created_at)}
                </p>
              </div>
            </div>

            {/* Phone Numbers */}
            {viewingPatient.patient_phones.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                  Telefonnummer
                </label>
                <div className="space-y-2">
                  {viewingPatient.patient_phones.map((phone) => (
                    <div key={phone.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-gray-900 dark:text-white">{phone.phone}</span>
                        <Badge variant="outline" className="text-xs">{phone.label}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(phone.phone, 'Telefonnummer')}
                        className="h-8 w-8 p-0"
                      >
                        {copiedText === phone.phone ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Stats */}
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                Meddelandestatistik
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">Totalt</span>
                  </div>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-300">
                    {viewingPatient.total_messages || 0}
                  </p>
                </div>
                {viewingPatient.last_message_status && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getMessageStatusIcon(viewingPatient.last_message_status)}
                      <span className="text-sm text-gray-700 dark:text-gray-400">Senaste status</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-300">
                      {viewingPatient.last_message_status === 'delivered' ? 'Levererat' :
                       viewingPatient.last_message_status === 'sent' ? 'Skickat' :
                       viewingPatient.last_message_status === 'failed' ? 'Misslyckat' : 'Väntar'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Last Message */}
            {viewingPatient.last_message_content && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                  Senaste meddelande
                </label>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getMessageStatusIcon(viewingPatient.last_message_status)}
                    <span className="text-sm text-gray-500">
                      Från {viewingPatient.last_message_sender} • {formatRelativeTime(viewingPatient.last_message_at || '')}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-white">
                    &quot;{viewingPatient.last_message_content}&quot;
                  </p>
                </div>
              </div>
            )}

            {/* Internal Notes */}
            {viewingPatient.internal_notes && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                  Interna anteckningar
                </label>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-gray-900 dark:text-white">{viewingPatient.internal_notes}</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingPatient(null)}
            >
              Stäng
            </Button>
            <Button
              onClick={() => {
                // Navigate to SMS page with patient pre-filled
                const primaryPhone = viewingPatient.patient_phones.find(p => p.label === 'Mobil') || viewingPatient.patient_phones[0];
                if (primaryPhone) {
                  window.location.href = `/sms?patient=${viewingPatient.cnumber}&phone=${primaryPhone.phone}`;
                } else {
                  window.location.href = `/sms?patient=${viewingPatient.cnumber}`;
                }
                setViewingPatient(null);
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Send className="w-4 h-4 mr-2" />
              Skicka SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeoutId = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [error]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8 relative">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-cyan-400/15 via-sky-400/10 to-blue-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-400/8 via-violet-400/6 via-pink-400/8 via-rose-400/6 to-blue-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '8s' }} />
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-blue-300/40 to-cyan-300/40 rounded-full blur-2xl animate-bounce" style={{ animationDelay: '3s', animationDuration: '5s' }} />
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-br from-purple-300/40 to-pink-300/40 rounded-full blur-2xl animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
      </div>

      <div className="relative z-10 space-y-8">

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50"
            >
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  {error}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError(null)}
                    className="h-4 w-4 p-0 ml-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent flex items-center gap-4">
                <div className="relative">
                  <MessageSquare className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                </div>
                SMS Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                Din kommandocentral för SMS-kommunikation ✨
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Uppdatera
              </Button>

              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 text-white hover:from-purple-700 hover:to-pink-700 dark:hover:from-purple-600 dark:hover:to-pink-600">
                <Download className="w-5 h-5 mr-2" />
                Exportera
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <StatCard
              title="Totalt meddelanden"
              value={(stats?.totalMessages || 0).toLocaleString()}
              subtitle="Sedan lansering"
              icon={MessageSquare}
              trend="+12%"
              gradient="from-blue-500 to-cyan-500"
            />

            <StatCard
              title="Skickade idag"
              value={stats?.sentToday || 0}
              subtitle={`Medel: ${Math.round((stats?.sentToday || 0) * 1.2)}/dag`}
              icon={Send}
              trend="+8%"
              gradient="from-green-500 to-emerald-500"
            />

            <StatCard
              title="Aktiva sessioner"
              value={stats?.activeSessions || 0}
              subtitle="Användare online"
              icon={Monitor}
              trend="+3"
              gradient="from-purple-500 to-violet-500"
            />

            <StatCard
              title="Aktiva patienter"
              value={stats?.activePatients || 0}
              subtitle="Kontaktade senaste månaden"
              icon={Users}
              trend="+15"
              gradient="from-pink-500 to-rose-500"
            />
          </motion.div>
        )}

        {/* Quick Stats Row */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            {/* Latest Contacted Patients */}
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Senast Kontaktade Patienter</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.activePatients || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                {messages.length > 0 ? (
                  messages
                    .filter(msg => msg.patients?.cnumber)
                    .slice(0, 5)
                    .map((message, index) => (
                      <div key={message.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold text-xs">
                              {message.patients?.cnumber?.[0] || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {message.patients?.cnumber || 'Okänd'}
                          </span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          {formatRelativeTime(message.created_at)}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">Ingen data tillgänglig</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Senders */}
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Topp Avsändare</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{topSenders.length || 0}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                {topSenders.length > 0 ? (
                  topSenders.slice(0, 5).map((sender, index) => (
                    <div key={sender.sender} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-xs">
                            {sender.sender[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-800 dark:text-white">{sender.sender}</span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 font-bold">{sender.count}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <Star className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">Ingen data tillgänglig</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Messages List */}
          <div className="lg:col-span-2 space-y-6">

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Sök meddelanden, patienter, telefonnummer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 hover:scale-105 transition-all duration-200 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Uppdatera
                </Button>
              </div>
            </motion.div>

            {/* Messages Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Senaste meddelanden
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Visar {filteredMessages.length} av {messages.length}
              </p>
            </div>

            {/* Messages */}
            <AnimatePresence mode="wait">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">Inga meddelanden hittades</h3>
                  <p className="text-gray-500 dark:text-gray-500">Prova att ändra sökfilter eller skicka ett nytt meddelande</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {filteredMessages.map((message) => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      onView={handleViewMessage}
                      onRetry={handleRetryMessage}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Live Global Chat Feed */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Live Chat Feed</h3>
                  <p className="text-gray-600 dark:text-gray-400">Global aktivitet</p>
                </div>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentChatMessages.length > 0 ? (
                  recentChatMessages.map((message) => (
                    <div key={message.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800 dark:text-white">
                            {message.username}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {formatRelativeTime(message.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {message.content.length > 60 
                            ? `${message.content.substring(0, 60)}...` 
                            : message.content
                          }
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">Inga chattmeddelanden än</p>
                    <p className="text-xs mt-1">Gå till chatten för att börja prata!</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Senaste aktivitet</h3>
                  <p className="text-gray-600 dark:text-gray-400">Live-uppdateringar</p>
                </div>
              </div>

              <div className="space-y-3">
                {systemEvents.length > 0 ? (
                  systemEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 text-sm">
                      <div className={`w-2 h-2 ${event.color} rounded-full ${event.type === 'sms_delivered' ? 'animate-pulse' : ''}`} />
                      <span className="text-gray-700 dark:text-gray-300 flex-1">
                        {event.message}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs ml-auto">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">Ingen aktivitet än</p>
                    <p className="text-xs mt-1">Skicka SMS eller skapa patienter för att se aktivitet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Patient Details Dialog */}
      <ViewPatientDialog />
    </div>
  );
}