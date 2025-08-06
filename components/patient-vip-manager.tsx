/**
 * ============================================
 * VIP PATIENT MANAGEMENT COMPONENT
 * ============================================
 * 
 * A comprehensive component for managing VIP patient status with:
 * - Real-time VIP status toggle
 * - Visual VIP indicators
 * - Bulk VIP operations
 * - VIP patient filtering
 * - Audit logging for VIP changes
 * 
 * @fileoverview VIP Patient Management System
 * @version 1.0.0
 * @author Audika Development Team
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  StarOff,
  Crown,
  Shield,
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Loader2,
  Eye,
  History
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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

import type { Patient } from '@/types';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface VIPPatientManagerProps {
  /** Array of patients to manage */
  patients: Patient[];
  /** Callback when VIP status changes */
  onVIPStatusChange: (patientId: string, isVIP: boolean) => Promise<void>;
  /** Callback for bulk VIP operations */
  onBulkVIPChange?: (patientIds: string[], isVIP: boolean) => Promise<void>;
  /** Whether component is in loading state */
  loading?: boolean;
  /** Whether current user can modify VIP status */
  canModifyVIP?: boolean;
  /** Custom VIP badge variant */
  vipBadgeVariant?: 'default' | 'crown' | 'star' | 'shield';
  /** Show VIP statistics */
  showStats?: boolean;
  /** Enable bulk operations */
  enableBulkOperations?: boolean;
  /** Custom CSS classes */
  className?: string;
}

interface VIPToggleProps {
  /** Patient to toggle VIP status for */
  patient: Patient;
  /** Callback when status changes */
  onToggle: (patientId: string, isVIP: boolean) => Promise<void>;
  /** Whether toggle is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Badge variant */
  variant?: 'default' | 'crown' | 'star' | 'shield';
}

interface VIPStats {
  total: number;
  vip: number;
  regular: number;
  vipPercentage: number;
  recentlyPromoted: number;
}

// ============================================
// VIP TOGGLE COMPONENT
// ============================================

const VIPToggle: React.FC<VIPToggleProps> = ({
  patient,
  onToggle,
  disabled = false,
  loading = false,
  variant = 'default'
}) => {
  const [isChanging, setIsChanging] = useState(false);

  const handleToggle = useCallback(async () => {
    if (disabled || loading || isChanging) return;

    setIsChanging(true);
    try {
      await onToggle(patient.id, !patient.is_vip);
      
      toast.success(
        patient.is_vip 
          ? `${patient.cnumber} removed from VIP` 
          : `${patient.cnumber} marked as VIP`,
        {
          description: patient.is_vip 
            ? 'Patient no longer has priority status'
            : 'Patient now has priority status',
          duration: 3000,
        }
      );
    } catch (error) {
      console.error('Error updating VIP status:', error);
      toast.error('Failed to update VIP status', {
        description: 'Please try again or contact support',
        duration: 5000,
      });
    } finally {
      setIsChanging(false);
    }
  }, [patient, onToggle, disabled, loading, isChanging]);

  const getVIPIcon = () => {
    if (isChanging || loading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    switch (variant) {
      case 'crown':
        return patient.is_vip ? <Crown className="h-4 w-4" /> : <Crown className="h-4 w-4 opacity-30" />;
      case 'star':
        return patient.is_vip ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />;
      case 'shield':
        return patient.is_vip ? <Shield className="h-4 w-4" /> : <Shield className="h-4 w-4 opacity-30" />;
      default:
        return patient.is_vip ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />;
    }
  };

  const getVIPColors = () => {
    if (!patient.is_vip) {
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-700'
      };
    }

    switch (variant) {
      case 'crown':
        return {
          bg: 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
          text: 'text-purple-700 dark:text-purple-300',
          border: 'border-purple-200 dark:border-purple-700'
        };
      case 'star':
        return {
          bg: 'bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30',
          text: 'text-yellow-700 dark:text-yellow-300',
          border: 'border-yellow-200 dark:border-yellow-700'
        };
      case 'shield':
        return {
          bg: 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-200 dark:border-blue-700'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gold-100 to-amber-100 dark:from-amber-900/30 dark:to-yellow-900/30',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-200 dark:border-amber-700'
        };
    }
  };

  const colors = getVIPColors();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={handleToggle}
            disabled={disabled || loading || isChanging}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
              border transition-all duration-200 hover:shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed
              ${colors.bg} ${colors.text} ${colors.border}
            `}
          >
            {getVIPIcon()}
            <span>
              {patient.is_vip ? 'VIP' : 'Regular'}
            </span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {patient.is_vip 
              ? 'Click to remove VIP status' 
              : 'Click to mark as VIP patient'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ============================================
// VIP STATISTICS COMPONENT
// ============================================

const VIPStatsDisplay: React.FC<{ stats: VIPStats }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
        {stats.total}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Total Patients
      </div>
    </div>
    
    <div className="text-center">
      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1">
        <Crown className="h-5 w-5" />
        {stats.vip}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        VIP Patients
      </div>
    </div>
    
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
        {stats.regular}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Regular Patients
      </div>
    </div>
    
    <div className="text-center">
      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
        {stats.vipPercentage.toFixed(1)}%
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        VIP Rate
      </div>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const VIPPatientManager: React.FC<VIPPatientManagerProps> = ({
  patients,
  onVIPStatusChange,
  onBulkVIPChange,
  loading = false,
  canModifyVIP = true,
  vipBadgeVariant = 'default',
  showStats = true,
  enableBulkOperations = true,
  className = ''
}) => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  const [searchQuery, setSearchQuery] = useState('');
  const [vipFilter, setVIPFilter] = useState<'all' | 'vip' | 'regular'>('all');
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'promote' | 'demote' | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      // Text search
      const matchesSearch = !searchQuery || 
        patient.cnumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.city?.toLowerCase().includes(searchQuery.toLowerCase());

      // VIP filter
      const matchesVIPFilter = 
        vipFilter === 'all' ||
        (vipFilter === 'vip' && patient.is_vip) ||
        (vipFilter === 'regular' && !patient.is_vip);

      return matchesSearch && matchesVIPFilter;
    });
  }, [patients, searchQuery, vipFilter]);

  const stats: VIPStats = useMemo(() => {
    const total = patients.length;
    const vip = patients.filter(p => p.is_vip).length;
    const regular = total - vip;
    const vipPercentage = total > 0 ? (vip / total) * 100 : 0;
    const recentlyPromoted = patients.filter(p => 
      p.is_vip && 
      p.updated_at && 
      new Date(p.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    return { total, vip, regular, vipPercentage, recentlyPromoted };
  }, [patients]);

  const selectedVIPCount = useMemo(() => {
    return Array.from(selectedPatients).filter(id => 
      patients.find(p => p.id === id)?.is_vip
    ).length;
  }, [selectedPatients, patients]);

  const selectedRegularCount = selectedPatients.size - selectedVIPCount;

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleSelectAll = useCallback(() => {
    if (selectedPatients.size === filteredPatients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(filteredPatients.map(p => p.id)));
    }
  }, [selectedPatients.size, filteredPatients]);

  const handleSelectPatient = useCallback((patientId: string) => {
    setSelectedPatients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  }, []);

  const handleBulkVIPAction = useCallback(async (action: 'promote' | 'demote') => {
    if (!onBulkVIPChange || selectedPatients.size === 0) return;

    setBulkLoading(true);
    try {
      const patientIds = Array.from(selectedPatients);
      await onBulkVIPChange(patientIds, action === 'promote');
      
      const actionText = action === 'promote' ? 'promoted to VIP' : 'removed from VIP';
      toast.success(`${patientIds.length} patients ${actionText}`, {
        description: 'Bulk operation completed successfully',
      });
      
      setSelectedPatients(new Set());
      setShowBulkConfirm(false);
      setBulkAction(null);
    } catch (error) {
      console.error('Error in bulk VIP operation:', error);
      toast.error('Bulk operation failed', {
        description: 'Some patients may not have been updated',
      });
    } finally {
      setBulkLoading(false);
    }
  }, [selectedPatients, onBulkVIPChange]);

  const openBulkConfirm = useCallback((action: 'promote' | 'demote') => {
    setBulkAction(action);
    setShowBulkConfirm(true);
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics */}
      {showStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <VIPStatsDisplay stats={stats} />
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* VIP Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={vipFilter}
              onChange={(e) => setVIPFilter(e.target.value as 'all' | 'vip' | 'regular')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
            >
              <option value="all">All Patients</option>
              <option value="vip">VIP Only</option>
              <option value="regular">Regular Only</option>
            </select>
          </div>
        </div>

        {/* Bulk Operations */}
        {enableBulkOperations && canModifyVIP && selectedPatients.size > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkConfirm('promote')}
              disabled={selectedRegularCount === 0}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <Crown className="h-4 w-4 mr-1" />
              Promote ({selectedRegularCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkConfirm('demote')}
              disabled={selectedVIPCount === 0}
              className="text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <StarOff className="h-4 w-4 mr-1" />
              Demote ({selectedVIPCount})
            </Button>
          </div>
        )}
      </div>

      {/* Patient List */}
      <div className="space-y-2">
        {/* Select All Header */}
        {enableBulkOperations && canModifyVIP && filteredPatients.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <Checkbox
              checked={selectedPatients.size === filteredPatients.length && filteredPatients.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Select All ({filteredPatients.length} patients)
            </span>
            {selectedPatients.size > 0 && (
              <Badge variant="secondary">
                {selectedPatients.size} selected
              </Badge>
            )}
          </div>
        )}

        {/* Patient Items */}
        <AnimatePresence>
          {filteredPatients.map((patient, index) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
            >
              {/* Selection Checkbox */}
              {enableBulkOperations && canModifyVIP && (
                <Checkbox
                  checked={selectedPatients.has(patient.id)}
                  onCheckedChange={() => handleSelectPatient(patient.id)}
                />
              )}

              {/* Patient Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {patient.cnumber}
                  </h3>
                  {patient.city && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {patient.city}
                    </span>
                  )}
                </div>
                {patient.last_contact_at && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last contact: {new Date(patient.last_contact_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* VIP Toggle */}
              {canModifyVIP ? (
                <VIPToggle
                  patient={patient}
                  onToggle={onVIPStatusChange}
                  disabled={loading}
                  variant={vipBadgeVariant}
                />
              ) : (
                <Badge
                  variant={patient.is_vip ? "default" : "secondary"}
                  className={patient.is_vip ? "bg-purple-100 text-purple-800" : ""}
                >
                  {patient.is_vip ? (
                    <>
                      <Crown className="h-3 w-3 mr-1" />
                      VIP
                    </>
                  ) : (
                    'Regular'
                  )}
                </Badge>
              )}

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Patient Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <History className="h-4 w-4 mr-2" />
                    Message History
                  </DropdownMenuItem>
                  {canModifyVIP && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onVIPStatusChange(patient.id, !patient.is_vip)}
                      >
                        {patient.is_vip ? (
                          <>
                            <StarOff className="h-4 w-4 mr-2" />
                            Remove VIP Status
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Mark as VIP
                          </>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No patients found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || vipFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No patients available'
              }
            </p>
          </div>
        )}
      </div>

      {/* Bulk Confirmation Dialog */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'promote' ? 'Promote to VIP' : 'Remove VIP Status'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'promote' ? (
                <>
                  You are about to promote {selectedRegularCount} patients to VIP status.
                  VIP patients receive priority handling and special indicators.
                </>
              ) : (
                <>
                  You are about to remove VIP status from {selectedVIPCount} patients.
                  They will be treated as regular patients going forward.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkAction && handleBulkVIPAction(bulkAction)}
              disabled={bulkLoading}
              className={
                bulkAction === 'promote' 
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              }
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {bulkAction === 'promote' ? (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Promote {selectedRegularCount}
                    </>
                  ) : (
                    <>
                      <StarOff className="h-4 w-4 mr-2" />
                      Remove VIP {selectedVIPCount}
                    </>
                  )}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VIPPatientManager;
export { VIPToggle, VIPStatsDisplay };
export type { VIPPatientManagerProps, VIPToggleProps, VIPStats };