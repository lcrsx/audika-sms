import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const avatarStackVariants = cva('flex items-center', {
  variants: {
    orientation: {
      vertical: 'flex-row -space-x-2',
      horizontal: 'flex-col -space-y-2',
    },
    size: {
      sm: 'space-x-1',
      md: 'space-x-2',
      lg: 'space-x-3',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
    size: 'md',
  },
})

export interface AvatarStackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarStackVariants> {
  avatars: { name: string; image: string }[]
  maxAvatarsAmount?: number
  showTooltip?: boolean
}

const AvatarStack = ({
  className,
  orientation,
  size,
  avatars,
  maxAvatarsAmount = 5,
  showTooltip = true,
  ...props
}: AvatarStackProps) => {
  const shownAvatars = avatars.slice(0, maxAvatarsAmount)
  const hiddenAvatars = avatars.slice(maxAvatarsAmount)

  const avatarSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <div
      className={cn(
        avatarStackVariants({ orientation, size }),
        className
      )}
      {...props}
    >
      {shownAvatars.map(({ name, image }, index) => {
        const avatar = (
          <Avatar 
            className={cn(
              avatarSize,
              "border-2 border-background shadow-sm hover:scale-105 transition-transform duration-200",
              "ring-2 ring-background/50"
            )}
            style={{ 
              zIndex: shownAvatars.length - index,
              transform: `translateX(${index * -2}px)`
            }}
          >
            <AvatarImage 
              src={image} 
              alt={name}
              className="object-cover"
            />
            <AvatarFallback className={cn(
              textSize,
              "font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white"
            )}>
              {name
                ?.split(' ')
                ?.map((word) => word[0])
                ?.join('')
                ?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )

        if (showTooltip) {
          return (
            <Tooltip key={`${name}-${image}-${index}`}>
              <TooltipTrigger asChild>
                {avatar}
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">{name}</p>
              </TooltipContent>
            </Tooltip>
          )
        }

        return avatar
      })}

      {hiddenAvatars.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              avatarSize,
              "flex items-center justify-center rounded-full border-2 border-background bg-muted/80 text-muted-foreground font-medium shadow-sm",
              textSize
            )}>
              +{hiddenAvatars.length}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="space-y-1">
              <p className="font-medium">More users online:</p>
              {hiddenAvatars.map(({ name }, index) => (
                <p key={`${name}-${index}`} className="text-sm">{name}</p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export { AvatarStack, avatarStackVariants }
