'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  Edit,
  Eye,
  UserPlus,
  Activity,
  Star,
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  Copy,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Heart,
  Zap,
  MessageCircle,
  ArrowUpDown,
  ChevronRight,
  UserCheck,
  UserX,
  X,
  Save
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { generatePatientAvatar } from '@/lib/avatar-utils';

// Enhanced Types
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

interface PatientStats {
  total: number;
  active: number;
  inactive: number;
  thisMonth: number;
  thisWeek: number;
  totalMessages: number;
  successRate: number;
}

type SortField = 'cnumber' | 'created_at' | 'last_contact_at' | 'total_messages' | 'city';
type SortDirection = 'asc' | 'desc';

// Main Component
export default function PatientCatalog() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [stats, setStats] = useState<PatientStats>({
    total: 0,
    active: 0,
    inactive: 0,
    thisMonth: 0,
    thisWeek: 0,
    totalMessages: 0,
    successRate: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; user_metadata?: { display_name?: string; full_name?: string } } | null>(null);
  
  // Dialog states
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    cnumber: string;
    city: string;
    internal_notes: string;
    gender: string;
    date_of_birth: string;
    phones: Array<{ id?: string; phone: string; label: string; customLabel?: string; isPrimary: boolean }>;
  }>({
    cnumber: '',
    city: '',
    internal_notes: '',
    gender: '',
    date_of_birth: '',
    phones: []
  });

  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [viewingMessages, setViewingMessages] = useState<Patient | null>(null);
  const [patientMessages, setPatientMessages] = useState<Array<{ id: string; content: string; created_at: string; status: string; sender_display_name: string; recipient_phone: string; infobip_message_id?: string }>>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPhones, setEditingPhones] = useState<Patient | null>(null);


  // Enhanced load patients to get current user info
  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      
      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User error:', userError);
        router.push('/auth/login');
        return;
      }
      
      console.log('👤 Current user ID:', user.id);
      setCurrentUser(user);
      
      // Get ALL patients with their phone numbers
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select(`
          *,
          patient_phones(*)
        `)
        .order('created_at', { ascending: false });

      if (patientsError) throw patientsError;

      // Get enhanced message info for each patient
      const patientsWithMessages = await Promise.all(
        (patientsData || []).map(async (patient) => {
          // Get message count
          const { count: messageCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('patient_cnumber', patient.cnumber);

          // Get last message with sender info - Fixed query
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('status, content, sender_display_name, created_at')
            .eq('patient_cnumber', patient.cnumber)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no messages exist

          return {
            ...patient,
            total_messages: messageCount || 0,
            last_message_status: lastMessage?.status || null,
            last_message_content: lastMessage?.content || null,
            last_message_sender: lastMessage?.sender_display_name || null,
            last_message_at: lastMessage?.created_at || null
          };
        })
      );

      setPatients(patientsWithMessages);
      setFilteredPatients(patientsWithMessages);
      
      // Calculate stats - Fixed success rate calculation
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const totalMessages = patientsWithMessages.reduce((sum, p) => sum + (p.total_messages || 0), 0);
      
      // Get all messages to calculate proper success rate
      const { data: allMessages } = await supabase
        .from('messages')
        .select('status');
      
      const successfulMessages = (allMessages || []).filter(m => 
        m.status === 'sent' || m.status === 'delivered'
      ).length;
      
      const successRate = totalMessages > 0 ? (successfulMessages / totalMessages) * 100 : 0;
      
      const stats: PatientStats = {
        total: patientsWithMessages.length,
        active: patientsWithMessages.filter(p => p.is_active).length,
        inactive: patientsWithMessages.filter(p => !p.is_active).length,
        thisMonth: patientsWithMessages.filter(p => new Date(p.created_at) >= thisMonth).length,
        thisWeek: patientsWithMessages.filter(p => new Date(p.created_at) >= thisWeek).length,
        totalMessages,
        successRate: Math.round(successRate)
      };
      
      setStats(stats);
    } catch (error) {
      console.error('Error loading patients:', error);
      setError('Kunde inte ladda patienter');
      toast.error('Kunde inte ladda patienter');
    } finally {
      setLoading(false);
    }
  }, [router]);


  const loadPatientMessages = async (patient: Patient) => {
    setLoadingMessages(true);
    try {
      const supabase = createClient();
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, content, status, sender_display_name, created_at, recipient_phone, infobip_message_id')
        .eq('patient_cnumber', patient.cnumber)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Messages query error:', error);
        throw error;
      }
      
      setPatientMessages(messages || []);
    } catch (error) {
      console.error('Error loading patient messages:', error);
      toast.error('Kunde inte ladda meddelanden');
      setPatientMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Add phone number with better error handling
  const addPhoneNumber = async (patientId: string, phone: string, label: string) => {
    try {
      // Basic phone number validation
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      if (!/^[\+]?[0-9\s\-\(\)]{7,15}$/.test(cleanPhone)) {
        throw new Error('Ogiltigt telefonnummer format');
      }
      
      const supabase = createClient();
      
      console.log('📱 Adding phone number:', { patientId, phone: cleanPhone, label });
      
      const { data: newPhone, error } = await supabase
        .from('patient_phones')
        .insert({
          patient_id: patientId,
          phone: cleanPhone,
          label: label
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Phone add error:', error);
        
        if (error.code === 'PGRST301' || error.code === '42501') {
          throw new Error('Du har inte behörighet att lägga till telefonnummer för denna patient.');
        } else if (error.code === '23505') {
          throw new Error('Detta telefonnummer finns redan registrerat.');
        } else {
          throw new Error(`Kunde inte lägga till telefonnummer: ${error.message}`);
        }
      }
      
      console.log('✅ Phone added successfully:', newPhone);
      toast.success('Telefonnummer tillagt!');
      return true;
    } catch (error) {
      console.error('Error adding phone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Kunde inte lägga till telefonnummer';
      toast.error(errorMessage);
      return false;
    }
  };

  // Delete phone number
  const deletePhoneNumber = async (phoneId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('patient_phones')
        .delete()
        .eq('id', phoneId);

      if (error) throw error;
      toast.success('Telefonnummer borttaget!');
      loadPatients();
    } catch (error) {
      console.error('Error deleting phone:', error);
      toast.error('Kunde inte ta bort telefonnummer');
    }
  };
  const togglePatientStatus = async (patient: Patient) => {
    try {
      const supabase = createClient();
      const newStatus = !patient.is_active;
      
      const { error } = await supabase
        .from('patients')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', patient.id);

      if (error) throw error;

      toast.success(`Patient ${newStatus ? 'aktiverad' : 'inaktiverad'}!`);
      loadPatients(); // Reload to update stats
    } catch (error) {
      console.error('Error toggling patient status:', error);
      toast.error('Kunde inte ändra patientstatus');
    }
  };

  // Delete patient
  const deletePatient = async (patient: Patient) => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      
      // First delete patient phones
      await supabase
        .from('patient_phones')
        .delete()
        .eq('patient_id', patient.id);
      
      // Then delete the patient
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patient.id);

      if (error) throw error;

      toast.success('Patient borttagen!');
      setDeletingPatient(null);
      loadPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Kunde inte ta bort patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced update patient with CNummer and phone management
  const updatePatient = async (formData: typeof editFormData) => {
    if (!editingPatient) return;
    
    // Validate required fields
    if (!formData.cnumber.trim()) {
      toast.error('CNummer är obligatoriskt');
      return;
    }
    
    // Validate date of birth if provided
    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      if (birthDate > today) {
        toast.error('Födelsedatum kan inte vara i framtiden');
        return;
      }
      if (birthDate < new Date('1900-01-01')) {
        toast.error('Födelsedatum verkar vara ogiltigt');
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      
      console.log('🔄 Updating patient:', editingPatient.cnumber, formData);
      
      // Get current user to check permissions
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Du är inte inloggad');
      }
      
      console.log('👤 Current user:', user.id);
      console.log('👤 Patient created by:', editingPatient.created_by);
      
      // Update patient basic info
      const { data: updatedPatient, error } = await supabase
        .from('patients')
        .update({
          cnumber: formData.cnumber,
          city: formData.city || null,
          internal_notes: formData.internal_notes || null,
          gender: formData.gender || null,
          date_of_birth: formData.date_of_birth || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPatient.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        
        // Check for specific error types
        if (error.code === 'PGRST301') {
          throw new Error('Du har inte behörighet att redigera denna patient. Kontakta en administratör.');
        } else if (error.code === '42501') {
          throw new Error('Säkerhetspolicy förhindrar redigering av auto-skapade patienter. Kontakta IT-support.');
        } else if (error.code === '23505') {
          throw new Error('Detta CNummer finns redan registrerat.');
        } else if (error.message.includes('RLS')) {
          throw new Error('Databasåtkomst nekad. Kontrollera dina behörigheter.');
        } else {
          throw new Error(`Databasfel: ${error.message}`);
        }
      }

      // Handle phone number updates
      const currentPhones = editingPatient.patient_phones;
      const newPhones = formData.phones;

      // Delete phones that are no longer in the list
      for (const currentPhone of currentPhones) {
        const stillExists = newPhones.find(np => np.id === currentPhone.id);
        if (!stillExists) {
          await supabase
            .from('patient_phones')
            .delete()
            .eq('id', currentPhone.id);
        }
      }

      // Add or update phones
      for (const newPhone of newPhones) {
        if (!newPhone.phone.trim()) continue; // Skip empty phone numbers
        
        if (newPhone.id) {
          // Update existing phone
          await supabase
            .from('patient_phones')
            .update({
              phone: newPhone.phone.trim(),
              label: newPhone.customLabel || newPhone.label
            })
            .eq('id', newPhone.id);
        } else {
          // Add new phone
          await supabase
            .from('patient_phones')
            .insert({
              patient_id: editingPatient.id,
              phone: newPhone.phone.trim(),
              label: newPhone.customLabel || newPhone.label
            });
        }
      }

      console.log('✅ Patient updated successfully:', updatedPatient);
      toast.success('Patient uppdaterad framgångsrikt!');
      setEditingPatient(null);
      setIsEditing(false);
      loadPatients();
      
    } catch (error) {
      console.error('❌ Error updating patient:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ett okänt fel inträffade';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing patient
  const startEditing = (patient: Patient) => {
    setEditingPatient(patient);
    setIsEditing(true);
    setEditFormData({
      cnumber: patient.cnumber,
      city: patient.city || '',
      internal_notes: patient.internal_notes || '',
      gender: patient.gender || '',
      date_of_birth: patient.date_of_birth || '',
      phones: patient.patient_phones.map((phone, index) => ({
        id: phone.id,
        phone: phone.phone,
        label: phone.label,
        isPrimary: index === 0 // First phone is primary
      }))
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingPatient(null);
    setIsEditing(false);
    setError(null); // Clear any error messages
    setEditFormData({
      cnumber: '',
      city: '',
      internal_notes: '',
      gender: '',
      date_of_birth: '',
      phones: []
    });
  };

  // Add new phone to edit form
  const addPhoneToForm = () => {
    setEditFormData(prev => ({
      ...prev,
      phones: [...prev.phones, { phone: '', label: 'Mobil', isPrimary: false }]
    }));
  };

  // Remove phone from edit form
  const removePhoneFromForm = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index)
    }));
  };

  // Update phone in edit form
  const updatePhoneInForm = (index: number, field: 'phone' | 'label' | 'customLabel' | 'isPrimary', value: string | boolean) => {
    setEditFormData(prev => ({
      ...prev,
      phones: prev.phones.map((phone, i) => 
        i === index 
          ? { ...phone, [field]: value }
          : field === 'isPrimary' && value === true
            ? { ...phone, isPrimary: false } // Unset other phones as primary
            : phone
      )
    }));
  };

  // Enhanced filtering and sorting
  useEffect(() => {
    let filtered = patients;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(patient => 
        patient.cnumber.toLowerCase().includes(query) ||
        patient.city?.toLowerCase().includes(query) ||
        patient.patient_phones.some(phone => phone.phone.includes(query)) ||
        patient.internal_notes?.toLowerCase().includes(query) ||
        patient.last_message_content?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    switch (activeFilter) {
      case 'active':
        filtered = filtered.filter(p => p.is_active);
        break;
      case 'inactive':
        filtered = filtered.filter(p => !p.is_active);
        break;
      case 'recent':
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(p => new Date(p.created_at) >= weekAgo);
        break;
      case 'vip':
        filtered = filtered.filter(p => p.total_messages && p.total_messages > 5);
        break;
      default:
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
          let aValue: string | number | null | undefined = a[sortField];
    let bValue: string | number | null | undefined = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Handle dates
      if (sortField === 'created_at' || sortField === 'last_contact_at') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }

      // Handle numbers
      if (sortField === 'total_messages') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      // Sort
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredPatients(filtered);
  }, [patients, searchQuery, activeFilter, sortField, sortDirection]);

  // Load patients on mount
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Copy to clipboard with enhanced feedback - no flickering
  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopiedText(text);
      toast.success(`${label} kopierat!`);
      // Use a longer timeout to prevent flickering
      setTimeout(() => setCopiedText(null), 3000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error(`Kunde inte kopiera ${label.toLowerCase()}`);
    }
  };

  // Navigate to SMS page with patient pre-filled
  const sendSMSToPatient = (patient: Patient) => {
    const primaryPhone = patient.patient_phones.find(p => p.label === 'Mobil') || patient.patient_phones[0];
    if (primaryPhone) {
      router.push(`/sms?patient=${patient.cnumber}&phone=${primaryPhone.phone}`);
    } else {
      router.push(`/sms?patient=${patient.cnumber}`);
    }
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Utility functions
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

  // Enhanced Patient Row Component
  const PatientRow = ({ patient }: { patient: Patient }) => {
    // const primaryPhone = patient.patient_phones.find(p => p.label === 'Mobil') || patient.patient_phones[0];
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="group bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 hover:shadow-lg hover:shadow-purple-500/10 dark:hover:shadow-purple-400/10 transition-all duration-200"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left section - Patient info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg group-hover:shadow-xl transition-all duration-300">
              <AvatarImage src={generatePatientAvatar(patient.cnumber)} alt={patient.cnumber} />
              <AvatarFallback className="text-white font-semibold text-sm">
                {getInitials(patient.cnumber)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="font-bold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1 group/copy cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyToClipboard(patient.cnumber, 'CNummer');
                  }}
                  style={{ minHeight: '24px', alignItems: 'center' }}
                >
                  <span className="select-none leading-none">{patient.cnumber}</span>
                  <div className="w-3 h-3 flex items-center justify-center flex-shrink-0">
                    {copiedText === patient.cnumber ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
                
                {getStatusBadge(patient)}
                
                {patient.total_messages && patient.total_messages > 5 && (
                  <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    VIP
                  </Badge>
                )}
                
                {patient.city === 'Auto-generated' && (
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Auto
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                {patient.city && patient.city !== 'Auto-generated' && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span>{patient.city}</span>
                  </div>
                )}
                
                {/* Show up to 2 phone numbers - vertical layout */}
                <div className="space-y-1">
                  {patient.patient_phones.slice(0, 2).map((phone) => (
                    <div
                      key={phone.id}
                      className="flex items-center gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group/phone cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyToClipboard(phone.phone, 'Telefonnummer');
                      }}
                    >
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="font-mono select-none leading-none text-xs">{phone.phone}</span>
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600">
                        {phone.label}
                      </Badge>
                      <div className="w-3 h-3 flex items-center justify-center flex-shrink-0">
                        {copiedText === phone.phone ? (
                          <CheckCircle className="w-3 h-3 text-green-500 transition-all duration-200" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-0 group-hover/phone:opacity-100 transition-all duration-200" />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Show +X if more than 2 phones */}
                  {patient.patient_phones.length > 2 && (
                    <button
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      onClick={() => setEditingPhones(patient)}
                    >
                      <Phone className="w-3 h-3" />
                      <span className="text-xs">+{patient.patient_phones.length - 2}</span>
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <MessageSquare className="w-3 h-3" />
                  <span>{patient.total_messages || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle section - Last message - Enhanced */}
          <div className="flex-1 min-w-0 lg:px-4">
            {patient.last_message_content ? (
              <div 
                className="space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 rounded-lg transition-all duration-200 group/message"
                onClick={() => {
                  setViewingMessages(patient);
                  loadPatientMessages(patient);
                }}
              >
                <div className="flex items-center gap-2">
                  {getMessageStatusIcon(patient.last_message_status)}
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {patient.last_message_sender} • {formatRelativeTime(patient.last_message_at || '')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover/message:opacity-100 transition-opacity" />
                </div>
                <p className="text-base text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed">
                  &quot;{patient.last_message_content}&quot;
                </p>
                <div className="text-xs text-purple-600 dark:text-purple-400 opacity-0 group-hover/message:opacity-100 transition-opacity">
                  Klicka för att se alla meddelanden
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 dark:text-gray-500 italic p-4">
                Inga meddelanden ännu
              </div>
            )}
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-8 px-3 text-xs shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => sendSMSToPatient(patient)}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    SMS
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Skicka SMS till patient</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200"
                    onClick={() => setViewingPatient(patient)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Visa
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Visa patientdetaljer</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>



            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200"
                    onClick={() => setEditingPhones(patient)}
                    disabled={!!(patient.city === 'Auto-generated' && currentUser && patient.created_by !== currentUser.id)}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Hantera
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {patient.city === 'Auto-generated' && currentUser && patient.created_by !== currentUser.id
                      ? 'Kan bara redigeras av skaparen'
                      : 'Hantera telefonnummer'
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 px-3 text-xs transition-all duration-200 ${
                      patient.is_active 
                        ? 'border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30' 
                        : 'border-green-300 dark:border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                    }`}
                    onClick={() => togglePatientStatus(patient)}
                  >
                    {patient.is_active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{patient.is_active ? 'Inaktivera patient' : 'Aktivera patient'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 hover:scale-105"
                    onClick={() => setDeletingPatient(patient)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ta bort patient</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Optional notes section */}
        {patient.internal_notes && (
          <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border-l-2 border-purple-200 dark:border-purple-800">
              <strong>Anteckning:</strong> {patient.internal_notes}
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  // Edit Patient Phone Numbers Dialog
  const EditPhonesDialog = () => {
    const [phones, setPhones] = useState<Array<{ id?: string; phone: string; label: string }>>(
      editingPhones?.patient_phones || []
    );
    const [newPhone, setNewPhone] = useState({ phone: '', label: 'Mobil' });

    const addNewPhone = () => {
      if (newPhone.phone.trim()) {
        setPhones([...phones, { ...newPhone }]);
        setNewPhone({ phone: '', label: 'Mobil' });
      }
    };

    const removePhone = (index: number) => {
      const phoneToRemove = phones[index];
      if (phoneToRemove.id) {
        deletePhoneNumber(phoneToRemove.id);
      }
      setPhones(phones.filter((_, i) => i !== index));
    };

    const savePhones = async () => {
      if (!editingPhones) return;
      
      setIsSubmitting(true);
      let hasErrors = false;
      
      try {
        // Add new phones
        for (const phone of phones) {
          if (!phone.id && phone.phone.trim()) {
            const success = await addPhoneNumber(editingPhones.id, phone.phone, phone.label);
            if (!success) {
              hasErrors = true;
            }
          }
        }
        
        if (!hasErrors) {
          setEditingPhones(null);
          await loadPatients();
        }
        
      } catch (error) {
        console.error('Error saving phones:', error);
        toast.error('Kunde inte spara alla telefonnummer');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Dialog open={!!editingPhones} onOpenChange={() => setEditingPhones(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-500" />
              Hantera Telefonnummer
            </DialogTitle>
            <DialogDescription>
              Redigera telefonnummer för {editingPhones?.cnumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing phones */}
            <div className="space-y-2">
              {phones.map((phone, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-mono text-sm">{phone.phone}</p>
                    <p className="text-xs text-gray-500">{phone.label}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(phone.phone, 'Telefonnummer')}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePhone(index)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add new phone */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Lägg till nytt nummer</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Telefonnummer"
                  value={newPhone.phone}
                  onChange={(e) => setNewPhone({ ...newPhone, phone: e.target.value })}
                />
                <select
                  value={newPhone.label}
                  onChange={(e) => setNewPhone({ ...newPhone, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="Mobil">Mobil</option>
                  <option value="Hem">Hem</option>
                  <option value="Arbete">Arbete</option>
                  <option value="Son">Son</option>
                  <option value="Dotter">Dotter</option>
                  <option value="Make/Maka">Make/Maka</option>
                  <option value="Partner">Partner</option>
                  <option value="Mor">Mor</option>
                  <option value="Far">Far</option>
                  <option value="Vårdnadshavare">Vårdnadshavare</option>
                  <option value="Kontaktperson">Kontaktperson</option>
                  <option value="Annat">Annat</option>
                </select>
                <Button
                  onClick={addNewPhone}
                  disabled={!newPhone.phone.trim()}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till nummer
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPhones(null)}
            >
              Avbryt
            </Button>
            <Button
              onClick={savePhones}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Spara ändringar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // View Patient Messages Dialog
  const ViewMessagesDialog = () => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending':
          return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'sent':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        case 'delivered':
          return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        case 'failed':
          return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      }
    };

    return (
      <Dialog open={!!viewingMessages} onOpenChange={() => setViewingMessages(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Meddelandehistorik - {viewingMessages?.cnumber}
            </DialogTitle>
            <DialogDescription>
              De senaste 10 meddelandena skickade till denna patient
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2" />
                <span>Laddar meddelanden...</span>
              </div>
            ) : patientMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Inga meddelanden hittade för denna patient</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patientMessages.map((message, index) => (
                  <motion.div 
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(message.status)} text-xs`}>
                          <div className="flex items-center gap-1">
                            {getMessageStatusIcon(message.status)}
                            {message.status === 'sent' ? 'Skickat' :
                             message.status === 'delivered' ? 'Levererat' : 
                             message.status === 'pending' ? 'Väntar' : 'Misslyckat'}
                          </div>
                        </Badge>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(message.created_at)}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {message.sender_display_name}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                      <p className="text-gray-900 dark:text-white leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Till: {message.recipient_phone}</span>
                      {message.infobip_message_id && (
                        <span className="font-mono">ID: {message.infobip_message_id.slice(-8)}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingMessages(null)}
            >
              Stäng
            </Button>
            <Button
              onClick={() => {
                if (viewingMessages) {
                  sendSMSToPatient(viewingMessages);
                  setViewingMessages(null);
                }
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Send className="w-4 h-4 mr-2" />
              Skicka nytt SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };


  // Enhanced View Patient Dialog with In-Place Editing
  const ViewPatientDialog = () => {
    if (!viewingPatient) return null;

    const patient = isEditing ? editingPatient : viewingPatient;
    if (!patient) return null;

    return (
      <Dialog open={!!viewingPatient} onOpenChange={() => {
        setViewingPatient(null);
        if (isEditing) {
          cancelEditing();
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              {isEditing ? 'Redigera Patient' : 'Patientdetaljer'} - {patient.cnumber}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Klicka på fälten för att redigera' : 'Visa patientdetaljer'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info Section */}
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Grundinformation
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CNummer */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    CNummer <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <Input
                      value={editFormData.cnumber}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, cnumber: e.target.value }))}
                      className="font-mono text-lg font-semibold"
                      placeholder="Ange CNummer..."
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                      {patient.cnumber}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    Status
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(patient)}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    Stad
                  </label>
                  {isEditing ? (
                    <Input
                      value={editFormData.city}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Ange stad..."
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {patient.city || 'Ej angivet'}
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    Kön
                  </label>
                  {isEditing ? (
                    <select
                      value={editFormData.gender}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Välj kön...</option>
                      <option value="male">Man</option>
                      <option value="female">Kvinna</option>
                      <option value="other">Annat</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {patient.gender === 'male' ? 'Man' : 
                       patient.gender === 'female' ? 'Kvinna' : 
                       patient.gender === 'other' ? 'Annat' : 'Ej angivet'}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    Födelsedatum
                  </label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editFormData.date_of_birth}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {patient.date_of_birth 
                        ? new Date(patient.date_of_birth).toLocaleDateString('sv-SE')
                        : 'Ej angivet'
                      }
                    </p>
                  )}
                </div>

                {/* Created */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    Skapad
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatRelativeTime(patient.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Phone Numbers Section */}
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-500" />
                  Telefonnummer
                </h3>
                {isEditing && (
                  <Button
                    onClick={addPhoneToForm}
                    variant="outline"
                    size="sm"
                    className="bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/30 border-green-300 dark:border-green-600 text-green-700 dark:text-green-400"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Lägg till
                  </Button>
                )}
              </div>
              
                             <div className="space-y-3">
                 {isEditing ? (
                   editFormData.phones.length > 0 ? (
                     editFormData.phones.map((phone, index) => (
                       <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                         <div className="flex items-center gap-3 mb-3">
                           <Phone className="w-4 h-4 text-green-500" />
                           <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Telefon {index + 1}</span>
                           <div className="flex items-center gap-2 ml-auto">
                             <input
                               type="radio"
                               name="primaryPhone"
                               checked={phone.isPrimary}
                               onChange={() => updatePhoneInForm(index, 'isPrimary', true)}
                               className="text-green-500 focus:ring-green-500"
                             />
                             <span className="text-sm text-gray-600 dark:text-gray-400">Primär</span>
                           </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                             <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nummer</label>
                             <Input
                               value={phone.phone}
                               onChange={(e) => updatePhoneInForm(index, 'phone', e.target.value)}
                               placeholder="0701234567"
                               className="font-mono text-sm"
                             />
                           </div>
                           <div>
                             <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Typ</label>
                             <div className="flex gap-1">
                               <select
                                 value={phone.label}
                                 onChange={(e) => updatePhoneInForm(index, 'label', e.target.value)}
                                 className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
                               >
                                 <option value="Mobil">Mobil</option>
                                 <option value="Hem">Hem</option>
                                 <option value="Arbete">Arbete</option>
                                 <option value="Son">Son</option>
                                 <option value="Dotter">Dotter</option>
                                 <option value="Make/Maka">Make/Maka</option>
                                 <option value="Partner">Partner</option>
                                 <option value="Mor">Mor</option>
                                 <option value="Far">Far</option>
                                 <option value="Vårdnadshavare">Vårdnadshavare</option>
                                 <option value="Kontaktperson">Kontaktperson</option>
                                 <option value="Annat">Annat</option>
                                 <option value="custom">Egen...</option>
                               </select>
                               {phone.label === 'custom' && (
                                 <Input
                                   placeholder="Egen typ"
                                   value={phone.customLabel || ''}
                                   onChange={(e) => updatePhoneInForm(index, 'customLabel', e.target.value)}
                                   className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
                                 />
                               )}
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex justify-end mt-3">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => removePhoneFromForm(index)}
                             className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                           >
                             <Trash2 className="w-4 h-4 mr-1" />
                             Ta bort
                           </Button>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                       <Phone className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                       <p className="text-sm">Inga telefonnummer</p>
                       <p className="text-xs mt-1">Klicka &quot;Lägg till&quot; för att börja</p>
                     </div>
                   )
                 ) : (
                  patient.patient_phones.length > 0 ? (
                    patient.patient_phones.map((phone, index) => (
                      <div key={phone.id} className="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg border border-green-200/50 dark:border-green-700/50">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-green-500" />
                          <span className="font-mono text-gray-900 dark:text-white font-medium">{phone.phone}</span>
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-600">
                            {phone.label}
                          </Badge>
                          {index === 0 && (
                            <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Primär
                            </Badge>
                          )}
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
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Phone className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm">Inga telefonnummer registrerade</p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Internal Notes Section */}
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-yellow-500" />
                Interna anteckningar
              </h3>
              
              {isEditing ? (
                <Textarea
                  value={editFormData.internal_notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                  placeholder="Lägg till interna anteckningar om patienten..."
                  rows={3}
                  className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-gray-900 dark:text-white">
                    {patient.internal_notes || 'Inga anteckningar tillagda'}
                  </p>
                </div>
              )}
            </div>

            {/* Message Stats Section */}
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                Meddelandestatistik
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Totalt meddelanden</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {patient.total_messages || 0}
                  </p>
                </div>
                
                {patient.last_message_status && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      {getMessageStatusIcon(patient.last_message_status)}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Senaste status</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {patient.last_message_status === 'delivered' ? 'Levererat' :
                       patient.last_message_status === 'sent' ? 'Skickat' :
                       patient.last_message_status === 'failed' ? 'Misslyckat' : 'Väntar'}
                    </p>
                  </div>
                )}
              </div>

              {/* Last Message */}
              {patient.last_message_content && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    {getMessageStatusIcon(patient.last_message_status)}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Från {patient.last_message_sender} • {formatRelativeTime(patient.last_message_at || '')}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-white italic">
                    &quot;{patient.last_message_content}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Avbryt
                </Button>
                <Button
                  onClick={() => updatePatient(editFormData)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Sparar...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Spara ändringar
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setViewingPatient(null)}
                  className="w-full sm:w-auto"
                >
                  Stäng
                </Button>
                <Button
                  onClick={() => startEditing(patient)}
                  disabled={!!(patient.city === 'Auto-generated' && currentUser && patient.created_by !== currentUser.id)}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Redigera
                </Button>
                <Button
                  onClick={() => {
                    sendSMSToPatient(patient);
                    setViewingPatient(null);
                  }}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Skicka SMS
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Delete Confirmation Dialog
  const DeletePatientDialog = () => (
    <AlertDialog open={!!deletingPatient} onOpenChange={() => setDeletingPatient(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Ta bort patient
          </AlertDialogTitle>
          <AlertDialogDescription>
            Är du säker på att du vill ta bort patienten <span className="font-bold">{deletingPatient?.cnumber}</span>?
            <br />
            <span className="text-red-600 font-medium">
              Detta kommer att ta bort all patientdata permanent och kan inte ångras.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            Avbryt
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletingPatient && deletePatient(deletingPatient)}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Tar bort...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Ta bort patient
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && patients.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Kunde inte ladda patienter
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <Button onClick={loadPatients} className="bg-purple-600 hover:bg-purple-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Försök igen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="relative">
                <Users className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
              Patientkatalog
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Hantera och kontakta dina patienter med kärlek
            </p>
          </div>

          <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 hover:scale-105 group">
            <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Ny Patient
          </Button>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg hover:shadow-purple-500/10 dark:hover:shadow-purple-400/10 transition-all duration-300 group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Totalt</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg hover:shadow-green-500/10 dark:hover:shadow-green-400/10 transition-all duration-300 group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Aktiva</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500 dark:text-green-400 group-hover:scale-110 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-300 group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Meddelanden</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalMessages}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg hover:shadow-orange-500/10 dark:hover:shadow-orange-400/10 transition-all duration-300 group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Inaktiva</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.inactive}</p>
                  </div>
                  <Shield className="w-8 h-8 text-orange-500 dark:text-orange-400 group-hover:scale-110 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Search and Filter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-6"
      >
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder="Sök patient (CNummer, stad, telefon, anteckningar, meddelanden...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'Alla', icon: Users },
                { key: 'active', label: 'Aktiva', icon: Activity },
                { key: 'vip', label: 'VIP', icon: Star },
                { key: 'recent', label: 'Senaste', icon: Clock },
                { key: 'inactive', label: 'Inaktiva', icon: Shield }
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={activeFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(key)}
                  className={`flex items-center gap-2 hover:scale-105 transition-all duration-200 ${
                    activeFilter === key 
                      ? 'bg-purple-600 text-white border-purple-600' 
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadPatients}
              className="flex items-center gap-2 hover:scale-105 transition-all duration-200 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4" />
              Uppdatera
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Sorting Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-4"
      >
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 rounded-xl border border-gray-200/30 dark:border-gray-700/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 'er' : ''} hittade
            </h2>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sortera:</span>
              {[
                { key: 'cnumber', label: 'CNummer' },
                { key: 'created_at', label: 'Skapad' },
                { key: 'last_contact_at', label: 'Senast kontakt' },
                { key: 'total_messages', label: 'Meddelanden' },
                { key: 'city', label: 'Stad' }
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort(key as SortField)}
                  className={`flex items-center gap-1 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-200 ${
                    sortField === key ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {label}
                  {sortField === key && (
                    <ArrowUpDown className={`w-3 h-3 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-2"
        >
          <AlertCircle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      {/* Patients List */}
      {filteredPatients.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center py-12"
        >
          <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery || activeFilter !== 'all' ? 'Inga patienter hittade' : 'Inga patienter än'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchQuery || activeFilter !== 'all' 
              ? 'Prova att ändra söktermer eller filter'
              : 'Lägg till din första patient för att komma igång'
            }
          </p>
          {!searchQuery && activeFilter === 'all' && (
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:scale-105 transition-all duration-200">
              <UserPlus className="w-4 h-4 mr-2" />
              Lägg till första patienten
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <PatientRow patient={patient} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer Info */}
      {filteredPatients.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 rounded-xl border border-gray-200/30 dark:border-gray-700/30 inline-block">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visar {filteredPatients.length} av {patients.length} patienter
              {searchQuery && ` • Sökning: "${searchQuery}"`}
              {activeFilter !== 'all' && ` • Filter: ${activeFilter}`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Dialogs */}
      <ViewPatientDialog />
      <DeletePatientDialog />
      <EditPhonesDialog />
      <ViewMessagesDialog />
    </div>
  );
}