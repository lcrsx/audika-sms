'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState, useRef } from 'react'

interface UseRealtimeChatProps {
  roomName: string
  username: string
}

export interface ChatEntry {
  id: string
  content: string
  user: {
    name: string
    id: string
  }
  createdAt: string
  status?: 'sending' | 'sent' | 'delivered' | 'error'
}

interface TypingUser {
  id: string
  name: string
  timestamp: number
}

const EVENT_CHAT_TYPE = 'chat'
const EVENT_TYPING_TYPE = 'typing'
const EVENT_STOP_TYPING_TYPE = 'stop_typing'

export function useRealtimeChat({ roomName, username }: UseRealtimeChatProps) {
  const supabase = createClient()
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([])
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up typing users that haven't typed in 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers(prev => prev.filter(user => now - user.timestamp < 3000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Load existing messages from database
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true)
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          setConnectionError('User not authenticated')
          return
        }

        // Load messages from database
        const { data: messages, error } = await supabase
          .from('chat')
          .select('*')
          .eq('room_name', roomName)
          .order('created_at', { ascending: true })
          .limit(100) // Limit to last 100 messages for performance

        if (error) {
          console.error('Error loading messages:', error)
          setConnectionError('Failed to load messages')
          return
        }

        // Convert database messages to ChatEntry format
        const loadedEntries: ChatEntry[] = messages.map(msg => ({
          id: msg.id.toString(),
          content: msg.content,
          user: {
            name: msg.username,
            id: msg.user_id
          },
          createdAt: msg.created_at,
          status: 'delivered'
        }))

        setChatEntries(loadedEntries)
        setConnectionError(null)
      } catch (err) {
        console.error('Failed to load messages:', err)
        setConnectionError('Failed to load messages')
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [roomName, supabase])

  useEffect(() => {
    const newChannel = supabase.channel(roomName)

    newChannel
      .on('broadcast', { event: EVENT_CHAT_TYPE }, (payload) => {
        const newEntry = payload.payload as ChatEntry
        setChatEntries((current) => {
          // Check if message already exists
          const exists = current.some(entry => entry.id === newEntry.id)
          if (exists) return current
          
          return [...current, { ...newEntry, status: 'delivered' }]
        })
      })
      .on('broadcast', { event: EVENT_TYPING_TYPE }, (payload) => {
        const typingUser = payload.payload as TypingUser
        if (typingUser.name !== username) {
          setTypingUsers(prev => {
            const existing = prev.find(user => user.id === typingUser.id)
            if (existing) {
              return prev.map(user => 
                user.id === typingUser.id 
                  ? { ...user, timestamp: Date.now() }
                  : user
              )
            }
            return [...prev, { ...typingUser, timestamp: Date.now() }]
          })
        }
      })
      .on('broadcast', { event: EVENT_STOP_TYPING_TYPE }, (payload) => {
        const stoppedUser = payload.payload as TypingUser
        setTypingUsers(prev => prev.filter(user => user.id !== stoppedUser.id))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setConnectionError(null)
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setConnectionError('Failed to connect to chat')
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
          setConnectionError('Connection timed out')
        }
      })

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [roomName, username, supabase])

  const sendTypingIndicator = useCallback(async () => {
    if (!channel || !isConnected) return

    await channel.send({
      type: 'broadcast',
      event: EVENT_TYPING_TYPE,
      payload: {
        id: crypto.randomUUID(),
        name: username,
        timestamp: Date.now(),
      },
    })
  }, [channel, isConnected, username])

  const sendStopTypingIndicator = useCallback(async () => {
    if (!channel || !isConnected) return

    await channel.send({
      type: 'broadcast',
      event: EVENT_STOP_TYPING_TYPE,
      payload: {
        id: crypto.randomUUID(),
        name: username,
        timestamp: Date.now(),
      },
    })
  }, [channel, isConnected, username])

  const sendChatEntry = useCallback(
    async (content: string) => {
      if (!channel || !isConnected) return

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setConnectionError('User not authenticated')
        return
      }

      const chatEntry: ChatEntry = {
        id: crypto.randomUUID(),
        content,
        user: {
          name: username,
          id: currentUser.id,
        },
        createdAt: new Date().toISOString(),
        status: 'sending',
      }

      // Add message to local state immediately
      setChatEntries((current) => [...current, chatEntry])

      try {
        // Store message in database
        const { data: dbMessage, error: dbError } = await supabase
          .from('chat')
          .insert({
            content: content,
            user_id: currentUser.id,
            username: username,
            room_name: roomName,
          })
          .select()
          .single()

        if (dbError) {
          throw dbError
        }

        // Update local message with database ID
        const updatedEntry = {
          ...chatEntry,
          id: dbMessage.id.toString(),
          status: 'sent' as const
        }

        setChatEntries((current) =>
          current.map((entry) =>
            entry.id === chatEntry.id ? updatedEntry : entry
          )
        )

        // Send message to channel for real-time updates
        await channel.send({
          type: 'broadcast',
          event: EVENT_CHAT_TYPE,
          payload: updatedEntry,
        })

        // Update status to delivered after a short delay
        setTimeout(() => {
          setChatEntries((current) =>
            current.map((entry) =>
              entry.id === updatedEntry.id ? { ...entry, status: 'delivered' } : entry
            )
          )
        }, 1000)

        // Stop typing indicator
        await sendStopTypingIndicator()

      } catch (error) {
        console.error('Failed to send message:', error)
        setChatEntries((current) =>
          current.map((entry) =>
            entry.id === chatEntry.id ? { ...entry, status: 'error' } : entry
          )
        )
        setConnectionError('Failed to send message')
      }
    },
    [channel, isConnected, username, roomName, supabase, sendStopTypingIndicator]
  )

  const startTyping = useCallback(async () => {
    if (!channel || !isConnected) return

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Send typing indicator
    await sendTypingIndicator()

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendStopTypingIndicator().catch(console.error)
    }, 3000)
  }, [channel, isConnected, sendTypingIndicator, sendStopTypingIndicator])

  const stopTyping = useCallback(async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    await sendStopTypingIndicator()
  }, [sendStopTypingIndicator])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return {
    chatEntries,
    sendChatEntry,
    isConnected,
    connectionError,
    typingUsers,
    startTyping,
    stopTyping,
    isLoading,
  }
}
