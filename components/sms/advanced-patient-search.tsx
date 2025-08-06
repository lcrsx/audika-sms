'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  Star,
  UserPlus,
  Filter,
  SortAsc,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDebouncedSearch } from '@/lib/hooks/use-debounced-search';

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
  message_count?: number;
  is_vip?: boolean;
}

interface AdvancedPatientSearchProps {
  patients: Patient[];
  isSearching: boolean;
  onPatientSelect: (patient: Patient) => void;
  selectedPatient: Patient | null;
  onSearchChange: (query: string) => void;
  onCreateNewPatient?: (cnumber: string) => void;
}

type SortOption = 'recent' | 'alphabetical' | 'messages' | 'created';
type FilterOption = 'all' | 'active' | 'vip' | 'recent';

/**
 * Advanced patient search with smart filtering, sorting, and suggestions
 * Apple-quality UX with intelligent search capabilities
 */
export function AdvancedPatientSearch({
  patients,
  isSearching,
  onPatientSelect,
  selectedPatient,
  onSearchChange,
  onCreateNewPatient
}: AdvancedPatientSearchProps) {
  const { searchTerm, debouncedSearchTerm, setSearchTerm } = useDebouncedSearch('', 300);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearchChange]);

  // Smart filtering and sorting
  const filteredAndSortedPatients = useMemo(() => {
    let filtered = patients;

    // Apply filters
    switch (filterBy) {
      case 'active':
        filtered = filtered.filter(p => p.is_active);
        break;
      case 'vip':
        filtered = filtered.filter(p => p.is_vip);
        break;
      case 'recent':
        filtered = filtered.filter(p => {
          if (!p.last_contact_at) return false;
          const lastContact = new Date(p.last_contact_at);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return lastContact > weekAgo;
        });
        break;
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.cnumber.localeCompare(b.cnumber);
        case 'messages':
          return (b.message_count || 0) - (a.message_count || 0);
        case 'created':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'recent':
        default:
          const aTime = a.last_contact_at ? new Date(a.last_contact_at).getTime() : 0;
          const bTime = b.last_contact_at ? new Date(b.last_contact_at).getTime() : 0;
          return bTime - aTime;
      }
    });

    return sorted;
  }, [patients, filterBy, sortBy]);

  // Detect if search looks like a new patient number
  const isNewPatientSearch = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 3) return false;
    
    const exists = patients.some(p => 
      p.cnumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // If it looks like a patient number format and doesn't exist
    return !exists && /^[a-zA-Z0-9\-_]{3,}$/.test(searchTerm.trim());
  }, [searchTerm, patients]);

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Aldrig';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Idag';
    if (diffDays === 1) return 'Igår';
    if (diffDays < 7) return `${diffDays} dagar sedan`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} veckor sedan`;
    return `${Math.floor(diffDays / 30)} månader sedan`;
  };

  return (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl p-8 border border-white/30 dark:border-slate-700/30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Välj Patient
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {patients.length} patienter tillgängliga
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="rounded-xl"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Sök patient (personnummer, telefon, stad)..."
          className="pl-12 pr-12 h-14 rounded-2xl border-2 focus:border-emerald-500 dark:focus:border-emerald-400 text-base"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-500 animate-spin" />
        )}
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-4">
              {/* Filter options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrera
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'Alla', icon: Users },
                    { value: 'active', label: 'Aktiva', icon: CheckCircle },
                    { value: 'vip', label: 'VIP', icon: Star },
                    { value: 'recent', label: 'Senaste veckan', icon: Clock }
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={filterBy === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterBy(value as FilterOption)}
                      className="rounded-xl"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sort options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sortera efter
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'recent', label: 'Senaste kontakt' },
                    { value: 'alphabetical', label: 'Alfabetisk' },
                    { value: 'messages', label: 'Antal meddelanden' },
                    { value: 'created', label: 'Nyligen skapad' }
                  ].map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={sortBy === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy(value as SortOption)}
                      className="rounded-xl"
                    >
                      <SortAsc className="w-4 h-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Patient */}
      {selectedPatient && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-emerald-800 dark:text-emerald-200">
              Vald patient: {selectedPatient.cnumber}
            </span>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Aktiv
            </Badge>
          </div>
        </motion.div>
      )}

      {/* New Patient Suggestion */}
      {isNewPatientSearch && onCreateNewPatient && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Patient &quot;{searchTerm}&quot; hittades inte
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Vill du skapa en ny patient?
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onCreateNewPatient(searchTerm)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Skapa
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Patients List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {filteredAndSortedPatients.length > 0 ? (
            filteredAndSortedPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onPatientSelect(patient)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedPatient?.id === patient.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 bg-white/50 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className={`font-bold ${
                      patient.is_vip 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                    }`}>
                      {patient.cnumber.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {patient.cnumber}
                      </p>
                      {patient.is_vip && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      {!patient.is_active && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {patient.patient_phones[0] && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{patient.patient_phones[0].phone}</span>
                        </div>
                      )}
                      
                      {patient.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{patient.city}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>Senaste: {formatRelativeTime(patient.last_contact_at)}</span>
                      </div>
                      
                      {patient.message_count && patient.message_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {patient.message_count} meddelanden
                        </Badge>
                      )}
                    </div>
                  </div>

                  {selectedPatient?.id === patient.id && (
                    <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  )}
                </div>
              </motion.div>
            ))
          ) : searchTerm ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Inga patienter hittades för &quot;{searchTerm}&quot;
              </p>
              <p className="text-sm text-gray-400">
                Försök ändra söktermer eller skapa en ny patient
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Börja skriv för att söka patienter
              </p>
              <p className="text-sm text-gray-400">
                Sök med personnummer, telefonnummer eller stad
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Statistics Footer */}
      {filteredAndSortedPatients.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              Visar {filteredAndSortedPatients.length} av {patients.length} patienter
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {patients.filter(p => p.is_vip).length} VIP
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {patients.filter(p => p.is_active).length} aktiva
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}