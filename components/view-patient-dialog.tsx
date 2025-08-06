'use client';

import React from 'react';
import { formatRelativeTime } from '@/lib/utils';
import {
  Phone,
  Eye,
  MessageSquare,
  Send,
  Copy,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Types for the patient data
interface PatientPhone {
  id: string;
  phone: string;
  label: string;
  patient_id: string;
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
  patient_phones: PatientPhone[];
  total_messages?: number;
  last_message_status?: 'pending' | 'sent' | 'delivered' | 'failed';
  last_message_content?: string;
  last_message_sender?: string;
  last_message_at?: string;
}

interface ViewPatientDialogProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  copiedText: string | null;
  onCopy: (text: string, label: string) => void;
  getStatusBadge: (patient: Patient) => React.ReactNode;
  getMessageStatusIcon: (status?: string) => React.ReactNode;
}

export function ViewPatientDialog({
  patient,
  isOpen,
  onClose,
  copiedText,
  onCopy,
  getStatusBadge,
  getMessageStatusIcon
}: ViewPatientDialogProps) {
  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Patientdetaljer - {patient.cnumber}
          </DialogTitle>
          <DialogDescription>
            Visa och hantera patientinformation
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">CNummer</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{patient.cnumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
              <div className="mt-1">
                {getStatusBadge(patient)}
              </div>
            </div>
            {patient.city && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stad</label>
                <p className="text-gray-900 dark:text-white">{patient.city}</p>
              </div>
            )}
            {patient.gender && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Kön</label>
                <p className="text-gray-900 dark:text-white">
                  {patient.gender === 'male' ? 'Man' : 
                   patient.gender === 'female' ? 'Kvinna' : 'Annat'}
                </p>
              </div>
            )}
            {patient.date_of_birth && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Födelsedatum</label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(patient.date_of_birth).toLocaleDateString('sv-SE')}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Skapad</label>
              <p className="text-gray-900 dark:text-white">
                {formatRelativeTime(patient.created_at)}
              </p>
            </div>
          </div>

          {/* Phone Numbers */}
          {patient.patient_phones.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                Telefonnummer
              </label>
              <div className="space-y-2">
                {patient.patient_phones.map((phone) => (
                  <div key={phone.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-gray-900 dark:text-white">{phone.phone}</span>
                      <Badge variant="outline" className="text-xs">{phone.label}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCopy(phone.phone, 'Telefonnummer')}
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
                  {patient.total_messages || 0}
                </p>
              </div>
              {patient.last_message_status && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getMessageStatusIcon(patient.last_message_status)}
                    <span className="text-sm text-gray-700 dark:text-gray-400">Senaste status</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-300">
                    {patient.last_message_status === 'delivered' ? 'Levererat' :
                     patient.last_message_status === 'sent' ? 'Skickat' :
                     patient.last_message_status === 'failed' ? 'Misslyckat' : 'Väntar'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Last Message */}
          {patient.last_message_content && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                Senaste meddelande
              </label>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getMessageStatusIcon(patient.last_message_status)}
                  <span className="text-sm text-gray-500">
                    Från {patient.last_message_sender} • {formatRelativeTime(patient.last_message_at || '')}
                  </span>
                </div>
                <p className="text-gray-900 dark:text-white">
                  &quot;{patient.last_message_content}&quot;
                </p>
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {patient.internal_notes && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                Interna anteckningar
              </label>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border-l-4 border-yellow-400">
                <p className="text-gray-900 dark:text-white">{patient.internal_notes}</p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Stäng
          </Button>
          <Button
            onClick={() => {
              // Navigate to SMS page with patient pre-filled
              const primaryPhone = patient.patient_phones.find(p => p.label === 'Mobil') || patient.patient_phones[0];
              if (primaryPhone) {
                window.location.href = `/sms?patient=${patient.cnumber}&phone=${primaryPhone.phone}`;
              } else {
                window.location.href = `/sms?patient=${patient.cnumber}`;
              }
              onClose();
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
}