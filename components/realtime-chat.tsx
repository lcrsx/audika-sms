'use client'

// import { formatRelativeTime } from '@/lib/utils'
import { ChatEntryItem } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import {
  type ChatEntry,
  useRealtimeChat,
} from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Users, Wifi, WifiOff, ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RealtimeChatProps {
  roomName: string
  username: string
  onChatEntry?: (chatEntries: ChatEntry[]) => void
  chatEntries?: ChatEntry[]
}

/**
 * Realtime chat component
 * @param roomName - The name of the room to join. Each room is a unique chat.
 * @param username - The username of the user
 * @param onChatEntry - The callback function to handle the chat entries. Useful if you want to store the chat entries in a database.
 * @param chatEntries - The chat entries to display in the chat. Useful if you want to display chat entries from a database.
 * @returns The chat component
 */
export const RealtimeChat = ({
  roomName,
  username,
  onChatEntry,
  chatEntries: initialChatEntries = [],
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [newChatEntry, setNewChatEntry] = useState('')
  // Typing is handled by the useRealtimeChat hook via typingUsers
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userDisplayName, setUserDisplayName] = useState<string>(username)
  const [currentUserSession, setCurrentUserSession] = useState<{
    id: string;
    email?: string;
    user_metadata?: {
      display_name?: string;
      role?: string;
      [key: string]: unknown;
    };
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const {
    chatEntries: realtimeChatEntries,
    sendChatEntry,
    isConnected,
    connectionError,
    typingUsers,
    startTyping,
    stopTyping,
    isLoading,
  } = useRealtimeChat({
    roomName,
    username: userDisplayName,
  })

  // Get current user ID and display name
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      setCurrentUserSession(user)
      
      // Get user metadata for display name
      if (user?.user_metadata?.display_name) {
        setUserDisplayName(user.user_metadata.display_name)
      } else if (user?.user_metadata?.full_name) {
        setUserDisplayName(user.user_metadata.full_name)
      } else if (user?.email) {
        setUserDisplayName(user.email.split('@')[0])
      }
    }
    getCurrentUser()

    // Listen for auth state changes to update immediately when user updates their avatar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setCurrentUserSession(session.user)
        // Update display name as well
        if (session.user.user_metadata?.display_name) {
          setUserDisplayName(session.user.user_metadata.display_name)
        } else if (session.user.user_metadata?.full_name) {
          setUserDisplayName(session.user.user_metadata.full_name)
        } else if (session.user.email) {
          setUserDisplayName(session.user.email.split('@')[0])
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Merge realtime chat entries with initial chat entries
  const allChatEntries = useMemo(() => {
    const mergedEntries = [...initialChatEntries, ...realtimeChatEntries]
    // Remove duplicates based on ID
    const uniqueEntries = mergedEntries.filter(
      (entry, index, self) => index === self.findIndex((e) => e.id === entry.id)
    )
    // Sort by creation time
    return uniqueEntries.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [initialChatEntries, realtimeChatEntries])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isBottom = scrollTop + clientHeight >= scrollHeight - 100
    setIsAtBottom(isBottom)
    setShowScrollButton(!isBottom)
  }, [containerRef])

  // Scroll to bottom when new chat entries arrive
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom()
    }
  }, [allChatEntries, scrollToBottom, isAtBottom])

  // Call onChatEntry callback when chat entries change
  useEffect(() => {
    if (onChatEntry) {
      onChatEntry(allChatEntries)
    }
  }, [allChatEntries, onChatEntry])

  // Typing indicator is handled by the useRealtimeChat hook

  const handleSendChatEntry = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newChatEntry.trim()) return

      await sendChatEntry(newChatEntry)
      setNewChatEntry('')
      inputRef.current?.focus()
    },
    [newChatEntry, sendChatEntry]
  )

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendChatEntry(e as React.KeyboardEvent<HTMLTextAreaElement>)
      }
    },
    [handleSendChatEntry]
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewChatEntry(e.target.value)
    if (e.target.value.length > 0) {
      startTyping()
    } else {
      stopTyping()
    }
  }, [startTyping, stopTyping])

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom()
    setIsAtBottom(true)
    setShowScrollButton(false)
  }, [scrollToBottom])

  return (
    <div className="flex flex-col h-[700px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl overflow-hidden shadow-lg relative">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-slate-700/20 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-indigo-500/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            {isConnected && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
              {roomName === 'global' ? 'Global Chat' : `Room: ${roomName}`}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span>Realtime conversation</span>
              {typingUsers.length > 0 && (
                <span className="text-purple-500 animate-pulse">• {typingUsers.length === 1 ? `${typingUsers[0].name} is typing` : `${typingUsers.length} people typing`}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Wifi className="w-4 h-4" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <WifiOff className="w-4 h-4" />
              <span>Connecting...</span>
            </div>
          )}
        </div>
      </div>

      {/* Chat Entries Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white/20 to-white/5 dark:from-slate-800/20 dark:to-slate-900/5 scroll-smooth"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-slate-600/20 animate-in fade-in duration-500">
              <div className="relative mx-auto mb-4 w-16 h-16">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full blur-lg opacity-50 scale-110 animate-pulse" />
                <div className="relative bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-full p-4 border-2 border-white/50">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading messages...</h4>
              <p className="text-gray-600 dark:text-gray-400">Fetching chat history from the database</p>
            </div>
          </div>
        ) : allChatEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-slate-600/20 animate-in fade-in duration-500">
              <div className="relative mx-auto mb-4 w-16 h-16">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full blur-lg opacity-50 scale-110 animate-pulse" />
                <div className="relative bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-full p-4 border-2 border-white/50">
                  <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No messages yet</h4>
              <p className="text-gray-600 dark:text-gray-400">Start the conversation and connect with others! ✨</p>
            </div>
          </div>
        ) : (
          allChatEntries.map((chatEntry, index) => {
            const previousEntry = index > 0 ? allChatEntries[index - 1] : null
            const showHeader = !previousEntry || previousEntry.user.id !== chatEntry.user.id
            const isOwnEntry = currentUserId === chatEntry.user.id
            const isLastMessage = index === allChatEntries.length - 1

            return (
              <ChatEntryItem
                key={chatEntry.id}
                chatEntry={chatEntry}
                isOwnEntry={isOwnEntry}
                showHeader={showHeader}
                isLastMessage={isLastMessage}
                currentUserSession={currentUserSession}
              />
            )
          })
        )}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-slate-600/20 w-fit">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {typingUsers.length === 1 
                ? `${typingUsers[0].name} is typing...`
                : `${typingUsers.length} people are typing...`
              }
            </span>
          </div>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <div className="absolute bottom-20 right-6 z-10">
          <Button
            onClick={handleScrollToBottom}
            size="sm"
            className="bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 hover:bg-white dark:hover:bg-slate-700 text-gray-900 dark:text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-10 h-10 p-0"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Chat Entry Input */}
      <form onSubmit={handleSendChatEntry} className="p-6 border-t border-white/20 dark:border-slate-700/20 bg-gradient-to-r from-white/30 via-white/20 to-white/30 dark:from-slate-800/30 dark:via-slate-800/20 dark:to-slate-800/30 backdrop-blur-sm">
        <div className="flex gap-3">
          {/* Message Input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newChatEntry}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              disabled={!isConnected}
              className="w-full bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border-white/30 dark:border-slate-600/30 focus:border-purple-400 focus:ring-purple-200 dark:focus:ring-purple-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-sm transition-all duration-300"
            />
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={!isConnected || !newChatEntry.trim()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        
        {connectionError && (
          <div className="flex items-center justify-center mt-3 text-sm text-red-600 dark:text-red-400">
            <div className="w-4 h-4 mr-2">⚠️</div>
            {connectionError}
          </div>
        )}
        
        {!isConnected && !connectionError && (
          <div className="flex items-center justify-center mt-3 text-sm text-orange-600 dark:text-orange-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
            Establishing connection...
          </div>
        )}
      </form>
    </div>
  )
}
