import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { generateCartoonAvatar } from '@/lib/avatar-utils'

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserImage = async () => {
      const { data, error } = await createClient().auth.getSession()
      if (error) {
        console.error(error)
      }

      const userAvatar = data.session?.user.user_metadata.avatar_url
      
      if (userAvatar) {
        setImage(userAvatar)
      } else {
        // Generate cartoonish avatar for users (staff)
        const username = data.session?.user.user_metadata.full_name || 
                        data.session?.user.email?.split('@')[0] || 
                        'user'
        
        const cartoonAvatar = generateCartoonAvatar(username)
        setImage(cartoonAvatar)
      }
    }
    fetchUserImage()
  }, [])

  return image
} 