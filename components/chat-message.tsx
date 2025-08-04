'use client'

import { cn, formatTime } from '@/lib/utils'
import { Check, CheckCheck, Clock } from 'lucide-react'
import { useState } from 'react'
import { type ChatEntry } from '@/hooks/use-realtime-chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { generateCartoonAvatar } from '@/lib/avatar-utils'

// Helper function to get initials
const getInitials = (name: string): string => {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'U';
};

interface ChatEntryItemProps {
  chatEntry: ChatEntry
  isOwnEntry: boolean
  showHeader: boolean
  isLastMessage?: boolean
  currentUserSession?: { id: string; email?: string; user_metadata?: any }
}

export const ChatEntryItem = ({ 
  chatEntry, 
  isOwnEntry, 
  showHeader, 
  isLastMessage = false,
  currentUserSession
}: ChatEntryItemProps) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const messageStatus = isOwnEntry ? chatEntry.status : null
  
  // Use session data for current user's avatar, otherwise use chat entry data
  const avatarName = isOwnEntry && currentUserSession ? 
    (currentUserSession.user_metadata?.display_name || currentUserSession.user_metadata?.full_name || chatEntry.user.name) :
    chatEntry.user.name
  
  const renderStatusIcon = () => {
    switch (messageStatus) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />
      case 'error':
        return <span className="text-red-500 text-xs">⚠️</span>
      default:
        return null
    }
  }

  return (
    <div 
      data-message-id={chatEntry.id}
      className={cn(
        "group flex transition-all duration-300 ease-out",
        isOwnEntry ? "justify-end" : "justify-start",
        isLastMessage && "animate-in slide-in-from-bottom-2 duration-500"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "max-w-[75%] w-fit flex flex-col gap-2",
          isOwnEntry ? "items-end" : "items-start"
        )}
      >
        {/* User Header */}
        {showHeader && (
          <div
            className={cn(
              "flex items-center gap-2 px-2 transition-all duration-300",
              isOwnEntry ? "justify-end flex-row-reverse" : "justify-start",
              isHovered ? "opacity-100" : "opacity-70"
            )}
          >
            {!isOwnEntry && (
              <div className="relative">
                <Avatar className="w-8 h-8 ring-2 ring-white/20 shadow-lg">
                  <AvatarImage src={generateCartoonAvatar(avatarName)} alt={chatEntry.user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 text-white text-sm font-medium">
                    {getInitials(chatEntry.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
            )}
            
            <div className={cn(
              "flex flex-col",
              isOwnEntry ? "items-end" : "items-start"
            )}>
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                {isOwnEntry ? 'You' : chatEntry.user.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(chatEntry.createdAt)}
              </span>
            </div>

            {isOwnEntry && (
              <div className="relative">
                <Avatar className="w-8 h-8 ring-2 ring-white/20 shadow-lg">
                  <AvatarImage src={generateCartoonAvatar(avatarName)} alt={chatEntry.user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white text-sm font-medium">
                    {getInitials(chatEntry.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "relative group/message transition-all duration-300 ease-out",
            "hover:scale-[1.02] active:scale-[0.98]",
            isOwnEntry ? "ml-auto" : "mr-auto"
          )}
        >
          {/* Message Content */}
          <div
            className={cn(
              "relative px-4 py-3 rounded-2xl shadow-sm border backdrop-blur-sm",
              "transition-all duration-300 ease-out",
              isOwnEntry 
                ? [
                    "bg-gradient-to-br from-purple-500 to-indigo-600 text-white",
                    "border-purple-400/30 shadow-purple-500/20",
                    "hover:shadow-lg hover:shadow-purple-500/30",
                    "hover:from-purple-600 hover:to-indigo-700"
                  ]
                : [
                    "bg-white/90 dark:bg-slate-700/90 text-gray-900 dark:text-white",
                    "border-white/20 dark:border-slate-600/20",
                    "hover:shadow-lg hover:shadow-gray-500/20 dark:hover:shadow-slate-500/20",
                    "hover:bg-white dark:hover:bg-slate-700"
                  ]
            )}
          >
            {/* Message Text */}
            <p className="leading-relaxed break-words text-sm font-medium">
              {chatEntry.content}
            </p>

            {/* Message Status (for own messages) */}
            {isOwnEntry && (
              <div className={cn(
                "absolute -bottom-1 -right-1 flex items-center gap-1",
                "opacity-0 group-hover/message:opacity-100 transition-opacity duration-200"
              )}>
                {renderStatusIcon()}
              </div>
            )}

            {/* Message Time (for other messages) */}
            {!isOwnEntry && (
              <div className={cn(
                "absolute -bottom-1 -left-1 opacity-0 group-hover/message:opacity-100",
                "transition-opacity duration-200"
              )}>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg backdrop-blur-sm">
                  {formatTime(chatEntry.createdAt)}
                </span>
              </div>
            )}
          </div>

          {/* Message Tail */}
          <div
            className={cn(
              "absolute top-3 w-3 h-3 transform rotate-45",
              isOwnEntry 
                ? [
                    "right-[-6px] bg-gradient-to-br from-purple-500 to-indigo-600",
                    "border-r border-purple-400/30 border-b border-purple-400/30"
                  ]
                : [
                    "left-[-6px] bg-white/90 dark:bg-slate-700/90",
                    "border-l border-white/20 dark:border-slate-600/20 border-b border-white/20 dark:border-slate-600/20"
                  ]
            )}
          />
        </div>

        {/* Typing Indicator (placeholder for future feature) */}
        {isLastMessage && !isOwnEntry && (
          <div className="flex items-center gap-1 px-2 opacity-50">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">typing...</span>
          </div>
        )}
      </div>
    </div>
  )
}
