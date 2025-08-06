'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  User, 
  Phone, 
  MessageSquare, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  FileText,
  Zap,
  Target,
  Eye,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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

interface EnhancedComposerProps {
  selectedPatient: Patient | null;
  message: string;
  isSending: boolean;
  onMessageChange: (message: string) => void;
  onSend: () => void;
  templates: MessageTemplate[];
  onTemplateSelect: (template: MessageTemplate) => void;
}

/**
 * World-class SMS composer with Apple-level UX
 * Features: Smart autocomplete, live preview, character counting, 
 * template suggestions, contact validation, accessibility
 */
export function EnhancedSMSComposer({
  selectedPatient,
  message,
  isSending,
  onMessageChange,
  onSend,
  templates,
  onTemplateSelect
}: EnhancedComposerProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<string[]>([]);
  const [messageStats, setMessageStats] = useState({
    characters: 0,
    words: 0,
    segments: 1,
    estimatedCost: 0
  });

  // Smart character counting with SMS segment calculation
  const calculateMessageStats = useCallback((text: string) => {
    const characters = text.length;
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // SMS segment calculation (160 chars per segment for GSM, 70 for Unicode)
    const hasUnicode = /[^\x00-\x7F]/.test(text);
    const charsPerSegment = hasUnicode ? 70 : 160;
    const segments = Math.max(1, Math.ceil(characters / charsPerSegment));
    
    // Estimated cost (example pricing)
    const estimatedCost = segments * 0.05; // 5 öre per segment
    
    return { characters, words, segments, estimatedCost };
  }, []);

  // Update message stats when message changes
  useEffect(() => {
    setMessageStats(calculateMessageStats(message));
  }, [message, calculateMessageStats]);

  // Smart template suggestions based on message content
  const suggestedTemplates = useMemo(() => {
    if (!message.trim() || message.length < 3) return [];
    
    const messageLower = message.toLowerCase();
    return templates
      .filter(template => {
        const templateLower = template.content.toLowerCase();
        const words = messageLower.split(/\s+/);
        return words.some(word => word.length > 2 && templateLower.includes(word));
      })
      .slice(0, 3)
      .sort((a, b) => b.use_count - a.use_count);
  }, [message, templates]);

  // Auto-save draft
  useEffect(() => {
    if (message.trim() && message.length > 10) {
      const timer = setTimeout(() => {
        const drafts = JSON.parse(localStorage.getItem('sms_drafts') || '[]');
        const newDrafts = [message, ...drafts.filter((d: string) => d !== message)].slice(0, 5);
        localStorage.setItem('sms_drafts', JSON.stringify(newDrafts));
        setSavedDrafts(newDrafts);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Load saved drafts on mount
  useEffect(() => {
    const drafts = JSON.parse(localStorage.getItem('sms_drafts') || '[]');
    setSavedDrafts(drafts);
  }, []);

  const handleSend = () => {
    if (!selectedPatient || !message.trim()) return;
    
    // Clear draft after sending
    const drafts = savedDrafts.filter(draft => draft !== message);
    localStorage.setItem('sms_drafts', JSON.stringify(drafts));
    setSavedDrafts(drafts);
    
    onSend();
  };

  const getCharacterColor = () => {
    if (messageStats.characters === 0) return 'text-gray-400';
    if (messageStats.characters > 1600) return 'text-red-500';
    if (messageStats.characters > 1400) return 'text-orange-500';
    if (messageStats.characters > 1200) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = () => {
    const ratio = messageStats.characters / 1600;
    if (ratio > 1) return 'bg-red-500';
    if (ratio > 0.875) return 'bg-orange-500';
    if (ratio > 0.75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl p-8 border border-white/30 dark:border-slate-700/30 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Skicka SMS
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Professionell SMS-kommunikation
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="rounded-xl"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Redigera' : 'Förhandsgranska'}
          </Button>
        </div>
      </div>

      {showPreview ? (
        /* Preview Mode */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-500" />
              SMS Förhandsvisning
            </h3>
            
            {selectedPatient && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Till: {selectedPatient.cnumber} ({selectedPatient.patient_phones[0]?.phone})
                </p>
              </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-l-4 border-blue-500">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                {message || <span className="text-gray-400 italic">Skriv ditt meddelande...</span>}
              </p>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tecken:</span>
                <span className={getCharacterColor()}>{messageStats.characters}/1600</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Segment:</span>
                <span className="text-gray-800 dark:text-gray-200">{messageStats.segments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Ord:</span>
                <span className="text-gray-800 dark:text-gray-200">{messageStats.words}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Kostnad:</span>
                <span className="text-gray-800 dark:text-gray-200">{messageStats.estimatedCost.toFixed(2)} kr</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Compose Mode */
        <div className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              Välj Patient *
            </label>
            
            {selectedPatient ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-green-500 text-white font-bold">
                    {selectedPatient.cnumber.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    {selectedPatient.cnumber}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {selectedPatient.patient_phones[0]?.phone || 'Inget telefonnummer'}
                  </p>
                  {selectedPatient.city && (
                    <p className="text-xs text-green-500 dark:text-green-500">
                      {selectedPatient.city}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Vald
                  </Badge>
                </div>
              </motion.div>
            ) : (
              <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-center">
                <User className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">Ingen patient vald</p>
                <p className="text-sm text-gray-400">Sök efter en patient för att fortsätta</p>
              </div>
            )}
          </div>

          {/* Message Composition */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Meddelande *
              </label>
              
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-medium ${getCharacterColor()}`}>
                  {messageStats.characters}/1600
                </span>
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${getProgressColor()}`}
                    style={{ width: `${Math.min(100, (messageStats.characters / 1600) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                placeholder="Skriv ditt meddelande här... Använd mallar för snabbare skrivning."
                className="min-h-[120px] resize-none rounded-2xl border-2 focus:border-blue-500 dark:focus:border-blue-400 transition-colors p-4 text-base leading-relaxed"
                maxLength={1600}
              />
              
              {/* Smart suggestions */}
              <AnimatePresence>
                {suggestedTemplates.length > 0 && message.length > 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 z-10"
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Föreslagna mallar
                      </p>
                      <div className="space-y-2">
                        {suggestedTemplates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => onTemplateSelect(template)}
                            className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {template.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {template.content}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Message info bar */}
            <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                  {messageStats.words} ord
                </span>
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Zap className="w-4 h-4" />
                  {messageStats.segments} segment{messageStats.segments !== 1 ? '' : ''}
                </span>
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Target className="w-4 h-4" />
                  ~{messageStats.estimatedCost.toFixed(2)} kr
                </span>
              </div>
            </div>
          </div>

          {/* Saved Drafts */}
          {savedDrafts.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Save className="w-4 h-4" />
                Sparade utkast
              </label>
              <div className="space-y-2">
                {savedDrafts.slice(0, 3).map((draft, index) => (
                  <button
                    key={index}
                    onClick={() => onMessageChange(draft)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {draft}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {draft.length} tecken
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Send Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleSend}
              disabled={isSending || !message.trim() || !selectedPatient || messageStats.characters > 1600}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  Skickar SMS...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-3" />
                  Skicka SMS ({messageStats.segments} segment{messageStats.segments !== 1 ? '' : ''})
                </>
              )}
            </Button>
          </motion.div>

          {/* Help text */}
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            <span className="text-red-500">*</span> = Obligatoriska fält • Meddelandet sparas automatiskt i databasen
          </p>
        </div>
      )}
    </motion.div>
  );
}