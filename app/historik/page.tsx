'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDebouncedSearch } from '@/lib/hooks/use-debounced-search'
import { usePagination, paginateArray } from '@/lib/hooks/use-pagination'
import { EnhancedPagination } from '@/components/enhanced-pagination'
import { useCache } from '@/lib/hooks/use-cache'
import { VirtualList } from '@/lib/hooks/use-virtual-scroll'
import { ListSkeleton } from '@/components/ui/loading-skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Phone,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  TrendingUp,
  BarChart3,
  MessageCircle,
} from 'lucide-react'

/**
 * Message interface for type safety
 */
interface Message {
  id: string
  content: string
  created_at: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  patient_cnumber: string
  recipient_phone: string
  sender_tag: string
  sender_display_name: string
  patients?: {
    cnumber: string
    city?: string
  } | null
  message_templates?: {
    name: string
  } | null
}

/**
 * Statistics interface
 */
interface MessageStats {
  totalMessages: number
  todayCount: number
  thisWeekCount: number
  thisMonthCount: number
  averageMessageLength: number
}

/**
 * User interface from database
 */
interface DBUser {
  id: string
  email: string
  username: string
  display_name?: string
  role: 'admin' | 'user'
  is_active: boolean
}

/**
 * Format time as relative string (e.g., "2h ago")
 */
const formatRelativeTime = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Nu'
  if (diffMinutes < 60) return `${diffMinutes}m sedan`
  if (diffHours < 24) return `${diffHours}h sedan`
  if (diffDays < 7) return `${diffDays}d sedan`
  return date.toLocaleDateString('sv-SE')
}

/**
 * Get status color classes for message status
 */
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    case 'sent':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    case 'delivered':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'failed':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
  }
}

/**
 * Get status icon for message status
 */
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-3 h-3" />
    case 'sent':
    case 'delivered':
      return <CheckCircle className="w-3 h-3" />
    case 'failed':
      return <AlertCircle className="w-3 h-3" />
    default:
      return <Clock className="w-3 h-3" />
  }
}

/**
 * Modern message card component inspired by Able Pro Material design
 */
function MessageHistoryItem({ message }: { message: Message }) {
  const [showFullContent, setShowFullContent] = useState(false)
  const isLongMessage = message.content.length > 120

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 overflow-hidden"
    >
      {/* Gradient accent on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
      
      <div className="relative p-6 space-y-5">
        {/* Modern Header with clearer sender info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Enhanced Status Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(message.status)}`}>
              {getStatusIcon(message.status)}
              {message.status === 'sent' ? 'Skickat' :
               message.status === 'delivered' ? 'Levererat' : 
               message.status === 'pending' ? 'Väntar' : 'Misslyckades'}
            </div>
            
            {/* Enhanced Timestamp */}
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {formatRelativeTime(message.created_at)}
              </span>
            </div>
          </div>
          
          {/* Enhanced Sender Information */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-800/30">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
              {(message.sender_display_name || message.sender_tag).charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                  {message.sender_display_name || message.sender_tag}
                </p>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                  Avsändare
                </span>
              </div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                Skickade detta meddelande till patienten
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Contact Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Phone Contact Card */}
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-100 dark:border-green-800/30">
            <div className="w-9 h-9 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
              <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-green-700 dark:text-green-300 font-semibold mb-0.5">Mottagare</p>
              <p className="font-mono text-sm font-bold text-green-900 dark:text-green-100 truncate">
                {message.recipient_phone}
              </p>
            </div>
          </div>
          
          {/* Patient Card */}
          {message.patients && (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold mb-0.5">Patient</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    {message.patients.cnumber}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Message Content */}
        <div className="relative">
          <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-700/30 dark:via-gray-800/50 dark:to-gray-700/30 rounded-2xl p-4 border border-gray-200/60 dark:border-gray-600/30 shadow-sm">
            <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${
              isLongMessage && !showFullContent ? 'line-clamp-4' : ''
            }`}>
              {message.content}
            </p>
          </div>
          
          {/* Enhanced Show More Button */}
          {isLongMessage && (
            <motion.div 
              className="mt-3 flex justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullContent(!showFullContent)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl px-4 py-2 text-xs font-medium transition-all duration-200 shadow-sm"
              >
                {showFullContent ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-2" />
                    Visa mindre
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 mr-2" />
                    Visa hela meddelandet
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>

        {/* Enhanced Template Badge */}
        {message.message_templates && (
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200/60 dark:border-purple-800/40 shadow-sm">
              <MessageCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                Mall: <span className="font-bold">{message.message_templates.name}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}


/**
 * Main Message History Page Component
 */
export default function MessageHistoryPage() {
  const router = useRouter()
  
  // State management
  const [messages, setMessages] = useState<Message[]>([])
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([])
  const [paginatedMessages, setPaginatedMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { searchTerm, debouncedSearchTerm, setSearchTerm } = useDebouncedSearch('', 300)
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'delivered' | 'failed' | 'pending'>('all')
  const [useVirtualization, setUseVirtualization] = useState(false)
  
  // Pagination setup for performance optimization
  const pagination = usePagination({
    totalItems: filteredMessages.length,
    pageSize: 20, // Start with 20 items per page for optimal performance
    initialPage: 1
  })

  // Enable virtualization for large datasets (>100 items)
  useEffect(() => {
    setUseVirtualization(filteredMessages.length > 100)
  }, [filteredMessages.length])
  const [stats, setStats] = useState<MessageStats>({
    totalMessages: 0,
    todayCount: 0,
    thisWeekCount: 0,
    thisMonthCount: 0,
    averageMessageLength: 0
  })
  
  // User state
  const [currentUser, setCurrentUser] = useState<{id: string; email?: string} | null>(null)
  const [dbUser, setDbUser] = useState<DBUser | null>(null)

  /**
   * Load current user and database user information
   */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/auth/login')
          return
        }

        setCurrentUser(user)

        // Get user from public.users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (userError) {
          console.error('Error fetching user:', userError)
          setError('Kunde inte ladda användarprofil')
          return
        }

        setDbUser(userData)
      } catch (error) {
        console.error('Error loading user:', error)
        setError('Kunde inte ladda användare')
      }
    }
    loadUser()
  }, [router])

  /**
   * Load message history from database with caching
   */
  const loadMessages = useCallback(async () => {
    if (!dbUser) return []

    const supabase = createClient()
    
    // Load all messages for the current user with related data
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select(`
        *,
        patients (
          cnumber,
          city
        ),
        message_templates (
          name
        )
      `)
      .eq('sender_id', dbUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading messages:', error)
      throw new Error('Kunde inte ladda meddelanden från databasen')
    }

    return messagesData || []
  }, [dbUser])

  // Use cached messages with automatic refresh
  const { 
    data: cachedMessages, 
    loading: messagesLoading, 
    error: messagesError,
    refresh: refreshMessages 
  } = useCache(
    `messages-${dbUser?.id}`,
    loadMessages,
    {
      cacheType: 'messages',
      ttl: 2 * 60 * 1000, // 2 minutes cache
      enabled: !!dbUser
    }
  )

  // Update local state when cached data changes
  useEffect(() => {
    if (cachedMessages) {
      setMessages(cachedMessages)
      
      // Calculate statistics
      if (cachedMessages && cachedMessages.length > 0) {
        const totalMessages = cachedMessages.length

        // Calculate time-based counts
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const todayCount = cachedMessages.filter(m => 
          new Date(m.created_at) >= today
        ).length

        const thisWeekCount = cachedMessages.filter(m => 
          new Date(m.created_at) >= weekAgo
        ).length

        const thisMonthCount = cachedMessages.filter(m => 
          new Date(m.created_at) >= monthAgo
        ).length

        // Calculate average message length
        const totalLength = cachedMessages.reduce((sum, m) => sum + m.content.length, 0)
        const averageMessageLength = Math.round(totalLength / totalMessages)

        setStats({
          totalMessages,
          todayCount,
          thisWeekCount,
          thisMonthCount,
          averageMessageLength
        })
      }
    }
  }, [cachedMessages])

  // Update loading and error states
  useEffect(() => {
    setIsLoading(messagesLoading)
    setError(messagesError?.message || null)
  }, [messagesLoading, messagesError])

  /**
   * Filter messages based on search query and status
   */
  useEffect(() => {
    let filtered = messages

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(message => message.status === statusFilter)
    }

    // Filter by search query using debounced term
    if (debouncedSearchTerm.trim()) {
      const query = debouncedSearchTerm.toLowerCase()
      filtered = filtered.filter(message => 
        message.content.toLowerCase().includes(query) ||
        message.recipient_phone.includes(query) ||
        message.patient_cnumber?.toLowerCase().includes(query) ||
        message.patients?.cnumber?.toLowerCase().includes(query)
      )
    }

    setFilteredMessages(filtered)
  }, [messages, debouncedSearchTerm, statusFilter])

  /**
   * Update paginated messages when filtered messages or pagination changes
   */
  useEffect(() => {
    const paginated = paginateArray(
      filteredMessages, 
      pagination.currentPage, 
      pagination.pageSize
    )
    setPaginatedMessages(paginated)
  }, [filteredMessages, pagination.currentPage, pagination.pageSize])

  // Load messages when user is ready
  useEffect(() => {
    if (dbUser) {
      loadMessages()
    }
  }, [dbUser, loadMessages])

  // Render virtual message item
  const renderVirtualMessage = useCallback(({ item: message, style }: {
    item: Message;
    index: number;
    style: React.CSSProperties;
  }) => (
    <div style={style} className="px-1 py-2">
      <MessageHistoryItem message={message} />
    </div>
  ), [])

  // Show loading spinner if not ready
  if (!currentUser || !dbUser || isLoading) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <ListSkeleton count={3} itemHeight={200} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-cyan-400/15 via-sky-400/10 to-blue-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-start mb-8">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="bg-white/80 dark:bg-slate-700/80 border-white/50 dark:border-slate-600/50 hover:bg-gray-50 dark:hover:bg-slate-600/80 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl shadow-sm transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </div>
          
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 mb-6 shadow-2xl">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            Meddelandehistorik
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Utforska all din SMS-kommunikation med detaljerad statistik och sökfunktioner
          </p>
          
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            {dbUser.display_name || dbUser.username} - {stats.totalMessages} meddelanden
          </Badge>
        </motion.div>

        {/* Statistics Cards - Modern Row Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl p-8 border border-white/30 dark:border-slate-700/30 shadow-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Total Messages */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.totalMessages}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Totalt</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Skickade meddelanden</div>
            </div>

            {/* Today */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.todayCount}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Idag</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Meddelanden idag</div>
            </div>

            {/* This Week */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.thisWeekCount}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Denna vecka</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Senaste 7 dagarna</div>
            </div>

            {/* This Month */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white shadow-lg">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.thisMonthCount}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Denna månad</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Senaste 30 dagarna</div>
            </div>

            {/* Average Length */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white shadow-lg">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.averageMessageLength}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Genomsnitt</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Tecken per meddelande</div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/30 dark:border-slate-700/30"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Sök i meddelanden, telefonnummer eller patienter..."
                className="pl-12 bg-white/80 dark:bg-slate-700/80 border-white/50 dark:border-slate-600/50 rounded-xl h-12"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'sent' | 'delivered' | 'failed' | 'pending')}
                className="bg-white/80 dark:bg-slate-700/80 border border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 transition-all duration-300"
              >
                <option value="all">Alla meddelanden</option>
                <option value="sent">Skickade</option>
                <option value="delivered">Levererade</option>
                <option value="pending">Väntande</option>
                <option value="failed">Misslyckade</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshMessages()}
                className="bg-white/80 dark:bg-slate-700/80 border-white/50 dark:border-slate-600/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-4 py-3 h-12"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Filtrerar {filteredMessages.length} av {messages.length} meddelanden
          </div>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination - only show when not using virtualization */}
        {!useVirtualization && filteredMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <EnhancedPagination 
              pagination={pagination}
              pageSizeOptions={[10, 20, 50, 100]}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 border border-white/30 dark:border-slate-700/30"
            />
          </motion.div>
        )}

        {/* Messages List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="space-y-4"
        >
          {useVirtualization && filteredMessages.length > 0 ? (
            // Virtual scrolling for large datasets
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-white/30 dark:border-slate-700/30 overflow-hidden">
              <VirtualList
                items={filteredMessages}
                itemHeight={220} // Approximate height of MessageHistoryItem
                height={600} // Container height
                renderItem={renderVirtualMessage}
                overscan={3}
                className="p-4"
                emptyComponent={
                  <div className="text-center py-16">
                    <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Inga meddelanden hittade
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Försök ändra dina sökkriterier eller filter
                    </p>
                  </div>
                }
              />
            </div>
          ) : paginatedMessages.length > 0 ? (
            // Regular pagination for smaller datasets
            <div className="space-y-4">
              <AnimatePresence>
                {paginatedMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MessageHistoryItem message={message} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-12 border border-white/30 dark:border-slate-700/30">
                <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {debouncedSearchTerm || statusFilter !== 'all' ? 'Inga matchande meddelanden' : 'Inga meddelanden än'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {debouncedSearchTerm || statusFilter !== 'all' 
                    ? 'Försök ändra dina sökkriterier eller filter' 
                    : 'Skicka ditt första SMS för att se historik här'}
                </p>
                {!debouncedSearchTerm && statusFilter === 'all' && (
                  <Button
                    onClick={() => router.push('/sms')}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Skicka SMS
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Bottom Pagination - only show when not using virtualization */}
        {!useVirtualization && filteredMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <EnhancedPagination 
              pagination={pagination}
              showPageSizeSelector={false}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 border border-white/30 dark:border-slate-700/30"
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}