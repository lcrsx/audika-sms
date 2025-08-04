'use client'
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendSingleSMS } from '@/lib/actions/messages';
import { validateAndNormalize } from '@/lib/actions/swe-format';
import {
  MessageSquare,
  Send,
  Search,
  User,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  History,
  Users,
  X,
  Plus,
  Eye,
  EyeOff,
  Filter,
  RefreshCw,
  TrendingUp,
  Calendar,
  Target,
  UserPlus,
  FileText as FileTextIcon,
  Sparkles,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { APP_CONFIG, UI_MESSAGES } from '@/lib/config/constants';
import { generateSecurePatientId } from '@/lib/utils/id-generator';
import { logger } from '@/lib/utils/logger';
// import { checkAtomicPatientCreationRateLimit } from '@/lib/utils/atomic-rate-limiter';
import { sanitizeSearchQuery, createLikePattern } from '@/lib/utils/search-sanitizer';
import { validateUserCreationData } from '@/lib/utils/user-validation';
import { createSafeTextContent, validateTextContent } from '@/lib/utils/text-renderer';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// ===========================
// TYPES
// ===========================

interface Patient {
  id: string;
  cnumber: string;
  city?: string;
  is_active: boolean;
  last_contact_at?: string;
  patient_phones: Array<{
    id: string;
    phone: string;
    label: string;
    patient_id: string;
  }>;
  created_by?: string;
  created_at?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  use_count: number;
  tags?: string[];
  variables?: Record<string, string>;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  patient_cnumber: string;
  recipient_phone: string;
  sender_tag: string;
  sender_display_name: string;
  patients?: {
    cnumber: string;
  }[] | {
    cnumber: string;
  } | null;
  message_templates?: {
    name: string;
  }[] | {
    name: string;
  } | null;
}

interface DBUser {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  role: 'admin' | 'user';
  is_active: boolean;
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Nu';
  if (diffMinutes < 60) return `${diffMinutes}m sedan`;
  if (diffHours < 24) return `${diffHours}h sedan`;
  if (diffDays < 7) return `${diffDays}d sedan`;
  return date.toLocaleDateString('sv-SE');
};

const getInitials = (name: string): string => {
  return name
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2) || 'P';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'sent':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    case 'delivered':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'failed':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-3 h-3" />;
    case 'sent':
      return <CheckCircle className="w-3 h-3" />;
    case 'delivered':
      return <CheckCircle className="w-3 h-3" />;
    case 'failed':
      return <AlertCircle className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
};

// ===========================
// MODERN COMPONENTS
// ===========================

function SMSCard({
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
      transition={{ duration: 0.6 }}
      className={`relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 group ${className}`}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br ${gradient} transition-opacity duration-500 rounded-3xl`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg group-hover:shadow-xl transition-all duration-300">
              {icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function PatientSearchItem({ patient, onSelect, isSelected, currentUser }: {
  patient: Patient;
  onSelect: (patient: Patient) => void;
  isSelected: boolean;
  currentUser?: { id: string; email?: string; user_metadata?: { display_name?: string; full_name?: string } } | null;
}) {
  const isAutoGenerated = patient.city === 'Auto-generated';
  const [lastContactUser, setLastContactUser] = useState<string>('');

  // Get who last contacted this patient
  useEffect(() => {
    const getLastContactUser = async () => {
      if (patient.created_by) {
        const supabase = createClient();
        
        // First check if it's the current user
        if (currentUser && patient.created_by === currentUser.id) {
          const currentUserDisplayName = currentUser.user_metadata?.display_name;
          const currentUserUsername = currentUser.email?.split('@')[0]?.toUpperCase();
          setLastContactUser(currentUserDisplayName || currentUserUsername || 'You');
          return;
        }
        
        // For other users, get from public.users table
        const { data: userData } = await supabase
          .from('users')
          .select('username, display_name, email')
          .eq('id', patient.created_by)
          .single();
        
        if (userData) {
          setLastContactUser(userData.display_name || userData.username || userData.email?.split('@')[0] || 'Unknown');
        }
      }
    };
    getLastContactUser();
  }, [patient.created_by, currentUser]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg'
          : 'border-white/30 dark:border-gray-700/30 bg-white/50 dark:bg-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
      }`}
      onClick={() => onSelect(patient)}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shadow-lg">
          <AvatarFallback className={`text-white text-sm font-bold ${
            isAutoGenerated 
              ? 'bg-gradient-to-br from-purple-500 to-pink-600' 
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}>
            {isAutoGenerated ? <UserPlus className="w-5 h-5" /> : getInitials(patient.cnumber)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
              {patient.cnumber}
            </p>
            {isAutoGenerated && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                <Sparkles className="w-3 h-3 mr-1" />
                Auto-skapad
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {!isAutoGenerated && patient.city && (
              <>
                <span>{patient.city}</span>
                <span>•</span>
              </>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              patient.is_active 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {patient.is_active ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
          {patient.last_contact_at && (
            <p className="text-xs text-gray-400 mt-1">
              Senast kontaktad: {formatRelativeTime(patient.last_contact_at)}
              {lastContactUser && (
                <span className="ml-1 text-blue-600 dark:text-blue-400 font-medium">
                  av {lastContactUser}
                </span>
              )}
            </p>
          )}
        </div>
        {patient.patient_phones?.[0] && (
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {patient.patient_phones[0].phone}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {patient.patient_phones[0].label}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MessageTemplateItem({ template, onSelect, isExpanded, onToggle }: {
  template: MessageTemplate;
  onSelect: (template: MessageTemplate) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="rounded-2xl bg-white/40 dark:bg-black/40 border border-white/30 dark:border-white/20 overflow-hidden transition-all duration-300 hover:shadow-lg"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                {template.name}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
            
            {template.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
                {template.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {template.use_count} användningar
              </Badge>
              {template.tags?.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(template)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shrink-0 hover:scale-110 transition-all duration-200"
          >
            <FileTextIcon className="w-4 h-4" />
          </Button>
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 pt-3 border-t border-white/20 dark:border-white/10"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-white/30 dark:bg-black/30 rounded-xl p-3 leading-relaxed">
                {template.content}
              </p>
              <Button
                onClick={() => onSelect(template)}
                size="sm"
                className="mt-3 w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <FileTextIcon className="w-4 h-4 mr-2" />
                Använd denna mall
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function RecentMessageItem({ message }: { message: Message }) {
  const [showFullContent, setShowFullContent] = useState(false);
  const isLongMessage = message.content.length > 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="p-4 rounded-2xl bg-white/40 dark:bg-black/40 border border-white/30 dark:border-white/20 hover:bg-white/50 dark:hover:bg-black/50 transition-all duration-300 hover:shadow-lg"
    >
      <div className="space-y-3">
        {/* Header with status and time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`text-xs font-medium ${getStatusColor(message.status)}`}>
              <div className="flex items-center gap-1">
                {getStatusIcon(message.status)}
                {message.status === 'sent' ? 'Skickat' :
                 message.status === 'delivered' ? 'Levererat' : 
                 message.status === 'pending' ? 'Väntar' : 'Misslyckat'}
              </div>
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {formatRelativeTime(message.created_at)}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">
            {message.sender_tag}
          </div>
        </div>
        
        {/* Recipient and patient info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 dark:text-white font-bold">Till:</span>
            <span className="text-gray-700 dark:text-gray-300 font-mono">{message.recipient_phone}</span>
          </div>
          
          {message.patients && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white font-bold">Patient:</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {Array.isArray(message.patients) ? message.patients[0]?.cnumber : message.patients?.cnumber}
              </span>
            </div>
          )}
        </div>
        
        {/* Message content */}
        <div className="relative">
          <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-3 ${
            isLongMessage && !showFullContent ? 'line-clamp-3' : ''
          }`}>
            {createSafeTextContent(message.content, true)}
          </p>
          {isLongMessage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-0 h-auto text-xs mt-2 hover:scale-105 transition-all duration-200"
            >
              {showFullContent ? (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Visa mindre
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Visa mer
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Template info */}
        {message.message_templates && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-2">
            <FileText className="w-3 h-3" />
            <span className="font-medium">Mall:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {Array.isArray(message.message_templates) ? message.message_templates[0]?.name : message.message_templates?.name}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ===========================
// MAIN COMPONENT WITH FIXED DATABASE INTEGRATION
// ===========================

export default function FixedSMSPage() {
  const router = useRouter();
  
  // Form states
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoCreatedPatient, setAutoCreatedPatient] = useState<boolean>(false);

  // Search states
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Template states
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // Message history
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageFilter, setMessageFilter] = useState<'all' | 'sent' | 'delivered' | 'failed'>('all');

  // User state - enhanced with DB user info
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; user_metadata?: { display_name?: string; full_name?: string } } | null>(null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);

  // Phone validation state
  const [phoneValidation, setPhoneValidation] = useState<{
    isValid: boolean;
    error?: string;
    displayFormat?: string;
  }>({ isValid: false });

  // Statistics state
  const [stats, setStats] = useState({
    totalMessages: 0,
    successRate: 0,
    todayCount: 0,
    thisWeekCount: 0
  });

  // ===========================
  // ENHANCED DATABASE FUNCTIONS
  // ===========================

  // Load current user with DB sync
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push('/auth/login');
          return;
        }

        setCurrentUser(user);

        // Get or create user in public.users table
        const username = user.email?.split('@')[0]?.toUpperCase() || 'USER';
        
        // Check if user exists in public.users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        let existingUser = userData;

        if (userError && userError.code === 'PGRST116') {
          // Validate user data before creation
          const userValidation = validateUserCreationData(
            user.id,
            user.email,
            username,
            user.user_metadata
          );
          
          if (!userValidation.isValid) {
            console.error('User validation failed:', userValidation.errors);
            setError('Ogiltiga användaruppgifter: ' + userValidation.errors.join(', '));
            return;
          }
          
          // User doesn't exist, create them with validated data
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .upsert(userValidation.data!)
            .select()
            .single();

          if (createError) {
            console.error('Error creating user:', createError);
            setError('Kunde inte skapa användarprofil');
            return;
          }

          existingUser = newUser;
        } else if (userError) {
          console.error('Error fetching user:', userError);
          setError('Kunde inte ladda användarprofil');
          return;
        }

        setDbUser(existingUser);
      } catch (error) {
        console.error('Error loading user:', error);
        setError('Kunde inte ladda användare');
      }
    };
    loadUser().catch((error) => {
      logger.error('Critical error loading user', error as Error);
      setError('Kunde inte ladda användarinformation');
      router.push('/auth/login');
    });
  }, [router]);

  // Enhanced patient search with proper joins
  const searchPatients = useCallback(async (query: string) => {
    if (!query.trim() || query.length < APP_CONFIG.PATIENT_SEARCH_MIN_LENGTH) {
      setPatients([]);
      return;
    }

    setIsSearching(true);
    try {
      // Sanitize search query to prevent SQL injection
      const searchValidation = sanitizeSearchQuery(query);
      if (!searchValidation.isValid) {
        console.error('Invalid search query:', searchValidation.errors);
        setIsSearching(false);
        return;
      }

      const supabase = createClient();
      const safePattern = createLikePattern(searchValidation.sanitized, 'contains');
      
      // First try with joins
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          cnumber,
          city,
          is_active,
          last_contact_at,
          created_by,
          created_at,
          patient_phones (
            id,
            phone,
            label,
            patient_id
          )
        `)
        .ilike('cnumber', safePattern)
        .eq('is_active', true)
        .order('last_contact_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error('Patient search error:', error);
        
        // Fallback to simple query without joins
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('patients')
          .select('*')
          .ilike('cnumber', safePattern)
          .eq('is_active', true)
          .order('last_contact_at', { ascending: false })
          .limit(8);

        if (fallbackError) throw fallbackError;
        
        // Manually fetch phones for each patient
        const patientsWithPhones = await Promise.allSettled(
          (fallbackData || []).map(async (patient) => {
            try {
              const { data: phones, error: phoneError } = await supabase
                .from('patient_phones')
                .select('*')
                .eq('patient_id', patient.id)
                .limit(3);
              
              if (phoneError) {
                logger.warn('Failed to fetch phones for patient', { metadata: { patientId: patient.id, error: phoneError } });
              }
              
              return {
                ...patient,
                patient_phones: phones || []
              };
            } catch (patientError) {
              logger.error('Error processing patient in search', patientError as Error, { metadata: { patientId: patient.id } });
              // Return patient without phones if phone fetch fails
              return {
                ...patient,
                patient_phones: []
              };
            }
          })
        );
        
        // Extract successful results from Promise.allSettled
        type PatientWithPhones = typeof fallbackData[0] & { patient_phones: unknown[] };
        const successfulPatients = patientsWithPhones
          .filter((result): result is PromiseFulfilledResult<PatientWithPhones> => result.status === 'fulfilled')
          .map(result => result.value);
        
        setPatients(successfulPatients);
      } else {
        setPatients(data || []);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      setError('Kunde inte söka patienter');
      toast.error('Kunde inte söka patienter');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Enhanced message loading with proper joins
  const loadRecentMessages = useCallback(async () => {
    if (!dbUser) return;

    console.log('🔄 Loading recent messages for user:', dbUser.username);
    setMessagesLoading(true);
    try {
      const supabase = createClient();
      
      // Load messages with patient and template info
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          status,
          patient_cnumber,
          recipient_phone,
          sender_tag,
          sender_display_name,
          patients (
            cnumber
          ),
          message_templates (
            name
          )
        `)
        .eq('sender_id', dbUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading messages:', error);
        setError('Kunde inte ladda meddelanden');
        return;
      }

      console.log('✅ Messages loaded:', messages?.length || 0);
      setRecentMessages(messages || []);
      
      // Calculate statistics
      const totalMessages = messages?.length || 0;
      const successfulMessages = messages?.filter(m => m.status === 'delivered' || m.status === 'sent').length || 0;
      const successRate = totalMessages > 0 ? (successfulMessages / totalMessages) * 100 : 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = messages?.filter(m => new Date(m.created_at) >= today).length || 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeekCount = messages?.filter(m => new Date(m.created_at) >= weekAgo).length || 0;

      setStats({
        totalMessages,
        successRate: Math.round(successRate),
        todayCount,
        thisWeekCount
      });
      
      console.log('📊 Stats updated:', { totalMessages, successRate, todayCount, thisWeekCount });

    } catch (error) {
      console.error('❌ Error loading recent messages:', error);
      setError('Kunde inte ladda meddelanden');
    } finally {
      setMessagesLoading(false);
    }
  }, [dbUser]);

// Fixed SMS sending function for component
// Simplified sendMessage function - let server action handle everything
const sendMessage = async () => {
  if (!message.trim() || !phoneNumber.trim() || !currentUser || !dbUser) {
    setError('Kontrollera att alla obligatoriska fält är ifyllda');
    return;
  }

  if (!phoneValidation.isValid) {
    setError(phoneValidation.error || 'Ogiltigt telefonnummer');
    return;
  }

  // Validate message content for XSS and malicious content
  const messageValidation = validateTextContent(message);
  if (!messageValidation.isValid) {
    setError('Meddelandet innehåller otillåtet innehåll: ' + messageValidation.errors.join(', '));
    logger.security('Malicious message content detected', { metadata: { errors: messageValidation.errors } });
    return;
  }

  logger.sms('Sending', { phone: phoneNumber });

  setIsSending(true);
  setError(null);
  setSuccess(null);
  setAutoCreatedPatient(false);

  try {
    // Only handle auto-patient creation if needed
    let patientCNumber = selectedPatient?.cnumber;
    let createdNewPatient = false;

    if (!selectedPatient) {
      logger.debug('Creating auto-patient for phone', { metadata: { phone: phoneNumber } });
      
      // Rate limiting temporarily disabled - re-enable after database migration is complete
      // if (currentUser) {
      //   const rateLimitResult = await checkAtomicPatientCreationRateLimit(currentUser.id);
      //   if (!rateLimitResult.allowed) {
      //     const waitTime = rateLimitResult.retryAfter || 300;
      //     logger.security('Patient creation rate limit exceeded', { 
      //       userId: currentUser.id,
      //       metadata: { remaining: rateLimitResult.remaining }
      //     });
      //     setError(`För många nya patienter skapade. Försök igen om ${Math.ceil(waitTime / 60)} minuter.`);
      //     return;
      //   }
      // }
      
      const supabase = createClient();
      const autoPatientCNumber = generateSecurePatientId(phoneNumber);
      
      // Check if auto-patient already exists
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('cnumber')
        .eq('cnumber', autoPatientCNumber)
        .single();

      if (!existingPatient) {
        // Create new auto-patient
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            cnumber: autoPatientCNumber,
            city: 'Auto-generated',
            is_active: true,
            created_by: dbUser.id,
            last_contact_at: new Date().toISOString()
          })
          .select()
          .single();

        if (patientError) {
          console.error('Error creating patient:', patientError);
          throw new Error('Kunde inte skapa patient: ' + patientError.message);
        }

        // Add phone number to patient_phones table
        const { error: phoneError } = await supabase
          .from('patient_phones')
          .insert({
            patient_id: newPatient.id,
            phone: phoneNumber,
            label: 'Mobil'
          });

        if (phoneError) {
          console.error('Error adding phone:', phoneError);
          // Continue anyway
        }

        patientCNumber = autoPatientCNumber;
        createdNewPatient = true;
        console.log('✅ Created auto-patient:', autoPatientCNumber);
      } else {
        patientCNumber = autoPatientCNumber;
      }
    }

    // Now ONLY call the server action - it handles SMS + message saving
    console.log('📱 Calling server action sendSingleSMS...');
    // Use the sanitized message content
    const result = await sendSingleSMS(
      messageValidation.sanitized,
      phoneNumber.trim(),
      patientCNumber
    );

    if (!result.success) {
      console.error('❌ Server action failed:', result.error);
      throw new Error(result.error || 'Kunde inte skicka SMS');
    }

    console.log('✅ SMS sent successfully via server action');

    // Clear form
    setMessage('');
    setSelectedPatient(null);
    setPhoneNumber('');
    setPatientSearch('');
    setPatients([]);
    setPhoneValidation({ isValid: false });

    // Show success
    if (createdNewPatient) {
      setAutoCreatedPatient(true);
      setSuccess('🎉 SMS skickat! En ny patient skapades automatiskt.');
    } else {
      setSuccess('✅ SMS skickat framgångsrikt!');
    }

    // Reload messages
    try {
      await loadRecentMessages();
    } catch (reloadError) {
      logger.warn('Failed to reload messages after sending SMS', { metadata: { error: reloadError } });
      // Don't fail the entire operation if reload fails
    }

    // Clear success after 7 seconds
    setTimeout(() => {
      setSuccess(null);
      setAutoCreatedPatient(false);
    }, 7000);

  } catch (error) {
    console.error('❌ Error in message sending process:', error);
    setError(error instanceof Error ? error.message : UI_MESSAGES.ERRORS.GENERIC);
  } finally {
    setIsSending(false);
  }
};

  // Handle URL parameters for pre-filling from patients page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientCNumber = urlParams.get('patient');
    const phone = urlParams.get('phone');
    
    if (patientCNumber) {
      setPatientSearch(patientCNumber);
      // Auto-search for the patient
      searchPatients(patientCNumber);
    }
    
    if (phone) {
      setPhoneNumber(phone);
    }
  }, [searchPatients]);

  // Validate phone number on change
  useEffect(() => {
    if (phoneNumber.trim()) {
      const validation = validateAndNormalize(phoneNumber);
      setPhoneValidation({
        isValid: validation.isValid,
        error: validation.error,
        displayFormat: validation.displayFormat ?? undefined
      });
    } else {
      setPhoneValidation({ isValid: false });
    }
  }, [phoneNumber]);

  // Load message templates from database
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('use_count', { ascending: false })
        .limit(12);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setError('Kunde inte ladda mallar');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    if (dbUser) {
      loadTemplates();
      loadRecentMessages();
    }
  }, [dbUser, loadTemplates, loadRecentMessages]);

  // Search patients when search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPatients(patientSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [patientSearch, searchPatients]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeoutId = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [error]);

  // Filter messages based on status
  const filteredMessages = recentMessages.filter(message => {
    if (messageFilter === 'all') return true;
    return message.status === messageFilter;
  });

  // Don't render until we have user data
  if (!currentUser || !dbUser) {
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
        {/* Enhanced animated background */}
        <div className="absolute inset-0 overflow-visible pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-cyan-400/15 via-sky-400/10 to-blue-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-400/8 via-violet-400/6 via-pink-400/8 via-rose-400/6 to-blue-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '8s' }} />
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-blue-300/40 to-cyan-300/40 rounded-full blur-2xl animate-bounce" style={{ animationDelay: '3s', animationDuration: '5s' }} />
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-br from-purple-300/40 to-pink-300/40 rounded-full blur-2xl animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Error/Success Messages */}
          <AnimatePresence>
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-4 right-4 z-50"
                >
                  <Alert className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 shadow-xl">
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

            {success && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-4 right-4 z-50"
                >
                  <Alert className={`border-2 shadow-xl ${
                    autoCreatedPatient 
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300 text-purple-800 dark:from-purple-900/20 dark:to-pink-900/20 dark:border-purple-600 dark:text-purple-300'
                      : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                  }`}>
                    {autoCreatedPatient ? <UserPlus className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {success}
                        {autoCreatedPatient && <Sparkles className="h-4 w-4 text-purple-600" />}
                      </div>
                      <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSuccess(null)}
                          className="h-4 w-4 p-0 ml-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Hero Section */}
          <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 mb-6 shadow-2xl">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-4 flex items-center justify-center gap-4">
              <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
              SMS Tjänst
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8 flex items-center justify-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Skicka SMS till dina patienter snabbt och säkert med fullständig databasintegrering
            </p>
            
            {/* Enhanced status display */}
            <div className="flex justify-center items-center gap-4 mb-8">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Inloggad som {dbUser.display_name || dbUser.username}
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                Databas synkroniserad ✓
              </Badge>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-center gap-4 mb-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/hem')}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                <Activity className="w-5 h-5" />
                Dashboard
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/patients')}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                <Users className="w-5 h-5" />
                Patienter
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/${dbUser.username.toLowerCase()}`)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                <User className="w-5 h-5" />
                Min Profil
              </motion.button>
            </div>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-3 max-w-7xl mx-auto">
            {/* SMS Form Section */}
            <div className="lg:col-span-2 space-y-6">
              <SMSCard
                  title="Skicka SMS"
                  icon={<Send className="w-6 h-6" />}
                  gradient="from-green-500/10 to-emerald-500/10"
              >
                <div className="space-y-6">
                  {/* Patient Search */}
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block">
                      Sök Patient (CNummer) - Valfritt
                    </label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          placeholder="Skriv CNummer för att söka... (lämna tom för att bara använda telefonnummer)"
                          className="pl-12 pr-4 py-4 bg-white/70 dark:bg-slate-600/70 border-white/30 dark:border-white/20 rounded-2xl text-base focus:ring-2 focus:ring-green-500 transition-all duration-300"
                      />
                      {isSearching && (
                          <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
                      )}
                    </div>

                    {/* Patient Search Results */}
                    <AnimatePresence>
                      {patients.length > 0 && (
                          <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 space-y-3 max-h-80 overflow-y-auto"
                          >
                            {patients.map((patient) => (
                                <PatientSearchItem
                                    key={patient.cnumber}
                                    patient={patient}
                                    currentUser={currentUser}
                                    onSelect={(p) => {
                                      setSelectedPatient(p);
                                      setPatientSearch(p.cnumber);
                                      setPatients([]);
                                      if (p.patient_phones?.[0]) {
                                        const phone = p.patient_phones[0].phone;
                                        setPhoneNumber(phone);
                                        // Force update phone validation
                                        const validation = validateAndNormalize(phone);
                                        setPhoneValidation({
                                          isValid: validation.isValid,
                                          error: validation.error,
                                          displayFormat: validation.displayFormat ?? undefined
                                        });
                                      }
                                    }}
                                    isSelected={selectedPatient?.cnumber === patient.cnumber}
                                />
                            ))}
                          </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Phone Number Input */}
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block">
                      Telefonnummer <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+46701234567 eller 0701234567"
                          className={`pl-12 pr-12 py-4 bg-white/70 dark:bg-slate-600/70 border-white/30 rounded-2xl text-base focus:ring-2 transition-all duration-300 ${
                              phoneNumber && !phoneValidation.isValid
                                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                  : phoneValidation.isValid
                                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                                      : 'focus:ring-green-500'
                          }`}
                          required
                      />
                      {phoneValidation.isValid && (
                          <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    
                    {/* Phone validation feedback */}
                    <div className="mt-2">
                      {selectedPatient ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-4 h-4 text-green-600" />
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                              Patient {selectedPatient.cnumber} vald
                            </p>
                          </div>
                          {selectedPatient.city === 'Auto-generated' && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Auto-skapad
                            </Badge>
                          )}
                        </div>
                      ) : phoneValidation.isValid ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                            Giltigt telefonnummer: {phoneValidation.displayFormat}
                          </p>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                            <UserPlus className="w-3 h-3 mr-1" />
                            Skapar ny patient
                          </Badge>
                        </div>
                      ) : phoneNumber && phoneValidation.error ? (
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                          ✗ {phoneValidation.error}
                        </p>
                      ) : (
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          Ange telefonnummer i svenskt format
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block">
                      Meddelande <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Skriv ditt meddelande här..."
                        rows={5}
                        className="bg-white/70 dark:bg-slate-600/70 border-white/30 dark:border-white/20 rounded-2xl resize-none text-base p-4 focus:ring-2 focus:ring-green-500 transition-all duration-300"
                        required
                    />
                    <div className="flex justify-between items-center mt-3">
                      <span className={`text-sm font-bold ${
                          message.length > 160
                              ? message.length > 320
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                              : 'text-gray-500'
                      }`}>
                        {message.length}/160 tecken
                      </span>
                      {message.length > 160 && (
                          <span className="text-sm font-bold text-amber-600">
                          {Math.ceil(message.length / 160)} SMS ({(Math.ceil(message.length / 160) * 0.85).toFixed(2)} SEK)
                        </span>
                      )}
                    </div>
                    {message.length > 1600 && (
                        <p className="text-sm text-red-600 mt-1 font-medium">
                          ⚠️ Meddelandet är för långt (max 1600 tecken)
                        </p>
                    )}
                  </div>

                  {/* Send Button */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                        onClick={sendMessage}
                        disabled={isSending || !message.trim() || !phoneValidation.isValid || message.length > 1600}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                      {isSending ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                            Skickar & sparar SMS...
                          </>
                      ) : (
                          <>
                            <Send className="h-5 w-5 mr-3" />
                            Skicka SMS (Sparas i databas)
                          </>
                      )}
                    </Button>
                  </motion.div>

                  {/* Required fields notice */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    <span className="text-red-500">*</span> = Obligatoriska fält • Alla meddelanden sparas automatiskt i databasen
                  </p>
                </div>
              </SMSCard>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Enhanced Message Templates */}
              <SMSCard
                  title="SMS Mallar"
                  icon={<FileTextIcon className="w-6 h-6" />}
                  gradient="from-blue-500/10 to-purple-500/10"
              >
                {templatesLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500 mb-4" />
                      <p className="text-sm text-gray-500">Laddar mallar...</p>
                    </div>
                ) : templates.length > 0 ? (
                    <div className="space-y-4">
                      {templates.slice(0, 4).map((template) => (
                          <MessageTemplateItem
                              key={template.id}
                              template={template}
                              isExpanded={expandedTemplate === template.id}
                              onToggle={() => setExpandedTemplate(
                                expandedTemplate === template.id ? null : template.id
                              )}
                              onSelect={(t) => {
                                setMessage(t.content);
                                setExpandedTemplate(null);
                              }}
                          />
                      ))}
                      {templates.length > 4 && (
                          <Button 
                            variant="ghost" 
                            className="w-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 py-3 rounded-xl"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Visa alla mallar ({templates.length})
                          </Button>
                      )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm text-gray-500">Inga mallar tillgängliga</p>
                    </div>
                )}
              </SMSCard>

              {/* Enhanced Statistics */}
              <SMSCard
                  title="Dina Statistik"
                  icon={<TrendingUp className="w-6 h-6" />}
                  gradient="from-orange-500/10 to-red-500/10"
              >
                <div className="grid grid-cols-2 gap-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-center p-4 rounded-2xl bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-black/60 transition-all duration-300"
                  >
                    <Target className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {stats.totalMessages}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Totalt
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center p-4 rounded-2xl bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-black/60 transition-all duration-300"
                  >
                    <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {stats.successRate}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Framgångsgrad
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center p-4 rounded-2xl bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-black/60 transition-all duration-300"
                  >
                    <Calendar className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {stats.todayCount}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Idag
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center p-4 rounded-2xl bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-black/60 transition-all duration-300"
                  >
                    <Clock className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {stats.thisWeekCount}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Denna vecka
                    </p>
                  </motion.div>
                </div>
              </SMSCard>

              {/* Recent Messages with Filter */}
              <SMSCard
                  title="Dina Senaste Meddelanden"
                  icon={<History className="w-6 h-6" />}
                  gradient="from-purple-500/10 to-pink-500/10"
              >
                {/* Filter Controls */}
                <div className="flex items-center gap-3 mb-6">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={messageFilter}
                    onChange={(e) => setMessageFilter(e.target.value as 'all' | 'sent' | 'delivered' | 'failed')}
                    className="flex-1 text-sm bg-white/70 dark:bg-slate-600/70 border border-white/30 dark:border-white/20 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                  >
                    <option value="all">Alla meddelanden</option>
                    <option value="sent">Skickade</option>
                    <option value="delivered">Levererade</option>
                    <option value="failed">Misslyckade</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadRecentMessages}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 hover:bg-white/50 dark:hover:bg-slate-600/50 rounded-xl transition-all duration-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {messagesLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500 mb-4" />
                      <p className="text-sm text-gray-500">Laddar meddelanden...</p>
                    </div>
                ) : filteredMessages.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {filteredMessages.map((msg, index) => (
                          <motion.div 
                            key={msg.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <RecentMessageItem message={msg} />
                          </motion.div>
                      ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm text-gray-500 font-medium">
                        {messageFilter === 'all' ? 'Inga meddelanden än' : `Inga ${messageFilter} meddelanden`}
                      </p>
                      {messageFilter === 'all' && (
                        <p className="text-xs text-gray-400 mt-2">Skicka ditt första SMS för att se det här</p>
                      )}
                    </div>
                )}
              </SMSCard>
            </div>
          </div>

          {/* Enhanced Information Section */}
          <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-6xl mx-auto"
          >
            <SMSCard
                title="Så Fungerar Det - Fullständig Databasintegrering"
                icon={<Users className="w-6 h-6" />}
                gradient="from-indigo-500/10 to-blue-500/10"
            >
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: User,
                    title: 'Automatisk Databassparning',
                    description: 'Alla SMS sparas först i databasen innan de skickas. Även om SMS-leveransen misslyckas finns meddelandet sparat.',
                    gradient: 'from-blue-50/80 to-indigo-50/80',
                    iconGradient: 'from-blue-500 to-blue-600'
                  },
                  {
                    icon: UserPlus,
                    title: 'Smart Patienthantering',
                    description: 'Patienter skapas automatiskt med korrekt CNummer och telefonnummer. Alla relationer hanteras automatiskt i databasen.',
                    gradient: 'from-purple-50/80 to-pink-50/80',
                    iconGradient: 'from-purple-500 to-purple-600'
                  },
                  {
                    icon: Clock,
                    title: 'Realtidssynkronisering',
                    description: 'Meddelandestatus uppdateras i realtid. Patienternas senaste kontakttid uppdateras automatiskt för fullständig spårbarhet.',
                    gradient: 'from-green-50/80 to-emerald-50/80',
                    iconGradient: 'from-green-500 to-green-600'
                  }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="group transition-all duration-300"
                  >
                    <div className={`backdrop-blur-lg bg-gradient-to-r ${item.gradient} dark:from-slate-800/30 dark:to-slate-700/30 rounded-3xl p-8 border border-white/30 dark:border-white/10 h-full hover:shadow-xl transition-all duration-300`}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${item.iconGradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">{item.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Database Status Display */}
              <div className="mt-8 p-6 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-800/50">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">Databas: Ansluten & Synkroniserad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Alla meddelanden sparas automatiskt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Patienter skapas vid behov</span>
                  </div>
                </div>
              </div>
            </SMSCard>
          </motion.div>
        </div>
      </div>
  );
}