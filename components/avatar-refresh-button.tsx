'use client'

import { Button } from '@/components/ui/button'
import { RefreshCw, Sparkles } from 'lucide-react'
import { generateRandomUserAvatar } from '@/lib/avatar-utils'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface AvatarRefreshButtonProps {
  onAvatarChange?: (newAvatarUrl: string) => void
  className?: string
}

export function AvatarRefreshButton({ onAvatarChange, className }: AvatarRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshAvatar = async () => {
    setIsRefreshing(true)
    
    try {
      const supabase = createClient()
      
      // Generate new random avatar
      const newAvatarUrl = generateRandomUserAvatar()
      
      // Update user metadata with new avatar
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar_url: newAvatarUrl
        }
      })

      if (error) {
        console.error('Error updating avatar:', error)
        return
      }

      // Call the callback if provided
      if (onAvatarChange) {
        onAvatarChange(newAvatarUrl)
      }

      // Show success feedback
      console.log('Avatar refreshed successfully! 🎉')
      
    } catch (error) {
      console.error('Failed to refresh avatar:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={className}
    >
      <Button
        onClick={handleRefreshAvatar}
        disabled={isRefreshing}
        variant="outline"
        size="sm"
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isRefreshing ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Genererar...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Ny Avatar
          </>
        )}
      </Button>
    </motion.div>
  )
} 