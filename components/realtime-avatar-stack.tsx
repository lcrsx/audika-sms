'use client'

import { AvatarStack } from '@/components/avatar-stack'
import { useRealtimePresenceRoom } from '@/hooks/use-realtime-presence-room'
import { useMemo } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

export const realtimeAvatarStackVariants = cva('', {
  variants: {
    size: {
      sm: '',
      md: '',
      lg: '',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export interface RealtimeAvatarStackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof realtimeAvatarStackVariants> {
  roomName: string
  maxAvatarsAmount?: number
  showTooltip?: boolean
  orientation?: 'vertical' | 'horizontal'
}

export const RealtimeAvatarStack = ({ 
  roomName, 
  maxAvatarsAmount = 5,
  showTooltip = true,
  orientation = 'vertical',
  size = 'md',
  className,
  ...props 
}: RealtimeAvatarStackProps) => {
  const { users: usersMap } = useRealtimePresenceRoom(roomName)
  const avatars = useMemo(() => {
    return Object.values(usersMap).map((user) => ({
      name: user.name,
      image: user.image,
    }))
  }, [usersMap])

  if (avatars.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50" />
      </div>
    )
  }

  return (
    <AvatarStack 
      avatars={avatars} 
      maxAvatarsAmount={maxAvatarsAmount}
      showTooltip={showTooltip}
      orientation={orientation}
      size={size}
      className={className}
      {...props}
    />
  )
}
