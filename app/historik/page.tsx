'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Loader2,
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
  Users,
  Target
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
  successRate: number
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
 * Message item component for displaying individual messages
 */
function MessageHistoryItem({ message }: { message: Message }) {
  const [showFullContent, setShowFullContent] = useState(false)
  const isLongMessage = message.content.length > 150

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-white/30 dark:border-slate-700/30 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 hover:shadow-lg backdrop-blur-sm"
    >
      <div className="space-y-3">
        {/* Header with status and time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={`text-xs font-medium ${getStatusColor(message.status)} border-0`}>
              <div className="flex items-center gap-1">
                {getStatusIcon(message.status)}
                {message.status === 'sent' ? 'Skickat' :
                 message.status === 'delivered' ? 'Levererat' : 
                 message.status === 'pending' ? 'Väntar' : 'Misslyckades'}
              </div>
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatRelativeTime(message.created_at)}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">
            {message.sender_tag}
          </div>
        </div>

        {/* Recipient and patient info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-500" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Till:</span>
            <span className="text-gray-900 dark:text-white font-mono font-bold">{message.recipient_phone}</span>
          </div>
          
          {message.patients && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-500" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Patient:</span>
              <span className="text-gray-900 dark:text-white font-bold">
                {message.patients.cnumber}
              </span>
              {message.patients.city === 'Auto-generated' && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400">
                  Auto-skapad
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Message content */}
        <div className="relative">
          <div className="bg-gray-50/70 dark:bg-gray-800/70 rounded-xl p-3 border border-gray-200/50 dark:border-gray-700/50">
            <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${
              isLongMessage && !showFullContent ? 'line-clamp-3' : ''
            }`}>
              {message.content}
            </p>
          </div>
          
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

        {/* Template info if available */}
        {message.message_templates && (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-900/20 rounded-lg p-2">
            <MessageCircle className="w-3 h-3" />
            <span className="font-medium">Mall:</span>
            <span className="font-bold">{message.message_templates.name}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Statistics card component
 */
function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = "blue",
  trend
}: { 
  title: string
  value: string | number
  subtitle: string
  icon: any
  color?: string
  trend?: string
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 text-blue-600",
    green: "from-green-500 to-green-600 text-green-600", 
    purple: "from-purple-500 to-purple-600 text-purple-600",
    orange: "from-orange-500 to-orange-600 text-orange-600",
    red: "from-red-500 to-red-600 text-red-600"
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/30 dark:border-slate-700/30 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${colorClasses[color]} flex items-center justify-center text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <Badge variant="outline" className={`${colorClasses[color]} border-current text-xs`}>
            {trend}
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="font-medium text-gray-900 dark:text-white text-sm">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'delivered' | 'failed' | 'pending'>('all')
  const [stats, setStats] = useState<MessageStats>({
    totalMessages: 0,
    successRate: 0,
    todayCount: 0,
    thisWeekCount: 0,
    thisMonthCount: 0,
    averageMessageLength: 0
  })
  
  // User state
  const [currentUser, setCurrentUser] = useState<any>(null)
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
   * Load message history from database
   */
  const loadMessages = useCallback(async () => {
    if (!dbUser) return

    setIsLoading(true)
    setError(null)
    
    try {
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

      setMessages(messagesData || [])
      
      // Calculate statistics
      if (messagesData && messagesData.length > 0) {
        const totalMessages = messagesData.length
        const successfulMessages = messagesData.filter(m => 
          m.status === 'delivered' || m.status === 'sent'
        ).length
        const successRate = Math.round((successfulMessages / totalMessages) * 100)

        // Calculate time-based counts
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const todayCount = messagesData.filter(m => 
          new Date(m.created_at) >= today
        ).length

        const thisWeekCount = messagesData.filter(m => 
          new Date(m.created_at) >= weekAgo
        ).length

        const thisMonthCount = messagesData.filter(m => 
          new Date(m.created_at) >= monthAgo
        ).length

        // Calculate average message length
        const totalLength = messagesData.reduce((sum, m) => sum + m.content.length, 0)
        const averageMessageLength = Math.round(totalLength / totalMessages)

        setStats({
          totalMessages,
          successRate,
          todayCount,
          thisWeekCount,
          thisMonthCount,
          averageMessageLength
        })
      }

    } catch (error) {
      console.error('Error loading messages:', error)
      setError(error instanceof Error ? error.message : 'Ett fel inträffade')
    } finally {
      setIsLoading(false)
    }
  }, [dbUser])

  /**
   * Filter messages based on search query and status
   */
  useEffect(() => {
    let filtered = messages

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(message => message.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(message => 
        message.content.toLowerCase().includes(query) ||
        message.recipient_phone.includes(query) ||
        message.patient_cnumber?.toLowerCase().includes(query) ||
        message.patients?.cnumber?.toLowerCase().includes(query)
      )
    }

    setFilteredMessages(filtered)
  }, [messages, searchQuery, statusFilter])

  // Load messages when user is ready
  useEffect(() => {
    if (dbUser) {
      loadMessages()
    }
  }, [dbUser, loadMessages])

  // Show loading spinner if not ready
  if (!currentUser || !dbUser || isLoading) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-500 dark:text-gray-400">Laddar meddelandehistorik...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8 relative">
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
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          <StatsCard
            title="Totalt"
            value={stats.totalMessages}
            subtitle="Skickade meddelanden"
            icon={MessageCircle}
            color="blue"
            trend={stats.thisMonthCount > 0 ? `+${stats.thisMonthCount} denna månad` : undefined}
          />
          <StatsCard
            title="Framgångsgrad"
            value={`${stats.successRate}%`}
            subtitle="Levererade meddelanden" 
            icon={Target}
            color="green"
          />
          <StatsCard
            title="Idag"
            value={stats.todayCount}
            subtitle="Meddelanden idag"
            icon={Calendar}
            color="purple"
          />
          <StatsCard
            title="Denna vecka"
            value={stats.thisWeekCount}
            subtitle="Senaste 7 dagarna"
            icon={TrendingUp}
            color="orange"
          />
          <StatsCard
            title="Denna månad"
            value={stats.thisMonthCount}
            subtitle="Senaste 30 dagarna"
            icon={BarChart3}
            color="red"
          />
          <StatsCard
            title="Genomsnitt"
            value={`${stats.averageMessageLength}`}
            subtitle="Tecken per meddelande"
            icon={MessageSquare}
            color="blue"
          />
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök i meddelanden, telefonnummer eller patienter..."
                className="pl-12 bg-white/80 dark:bg-slate-700/80 border-white/50 dark:border-slate-600/50 rounded-xl h-12"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white/80 dark:bg-slate-700/80 border border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 transition-all duration-300"
              >
                <option value="all">Alla status</option>
                <option value="sent">Skickade</option>
                <option value="delivered">Levererade</option>
                <option value="pending">Väntande</option>
                <option value="failed">Misslyckade</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={loadMessages}
                className="bg-white/80 dark:bg-slate-700/80 border-white/50 dark:border-slate-600/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-4 py-3 h-12"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Visar {filteredMessages.length} av {messages.length} meddelanden
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

        {/* Messages List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="space-y-4"
        >
          {filteredMessages.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredMessages.map((message, index) => (
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
                  {searchQuery || statusFilter !== 'all' ? 'Inga matchande meddelanden' : 'Inga meddelanden än'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Försök ändra dina sökkriterier eller filter' 
                    : 'Skicka ditt första SMS för att se historik här'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
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
      </div>
    </div>
  )
}