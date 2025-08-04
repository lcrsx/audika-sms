'use client'

import { useCurrentUserImage } from '@/hooks/use-current-user-image'
import { useCurrentUserName } from '@/hooks/use-current-user-name'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { generateCartoonAvatar } from '@/lib/avatar-utils'

const supabase = createClient()

export type RealtimeUser = {
  id: string
  name: string
  image: string
}

export const useRealtimePresenceRoom = (roomName: string) => {
  const currentUserImage = useCurrentUserImage()
  const currentUserName = useCurrentUserName()

  const [users, setUsers] = useState<Record<string, RealtimeUser>>({})

  useEffect(() => {
    const room = supabase.channel(roomName)

    room
      .on('presence', { event: 'sync' }, () => {
        const newState = room.presenceState<{ image: string; name: string }>()

        const newUsers = Object.fromEntries(
          Object.entries(newState).map(([key, values]) => {
            const presence = values[0]
            const name = presence.name || 'Anonymous'
            const image = presence.image || generateCartoonAvatar(name)
            
            return [
              key,
              { name, image },
            ]
          })
        ) as Record<string, RealtimeUser>
        setUsers(newUsers)
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') {
          return
        }

        // Use cartoonish avatar if no image is available
        const userImage = currentUserImage || generateCartoonAvatar(currentUserName)

        await room.track({
          name: currentUserName,
          image: userImage,
        })
      })

    return () => {
      room.unsubscribe()
    }
  }, [roomName, currentUserName, currentUserImage])

  return { users }
}
