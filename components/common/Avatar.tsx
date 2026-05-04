import Image from 'next/image'
import { cn, getInitials, generateAvatarColor } from '@/lib/utils'
import { User } from 'lucide-react'

export interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  }

  if (src) {
    return (
      <div className={cn('relative rounded-full overflow-hidden shrink-0', sizeStyles[size], className)}>
        <Image
          src={src}
          alt={name || 'Avatar'}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
    )
  }

  if (name) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-medium text-white',
          sizeStyles[size],
          generateAvatarColor(name),
          className
        )}
      >
        {getInitials(name)}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center bg-surface-light text-text-tertiary',
        sizeStyles[size],
        className
      )}
    >
      <User className="w-1/2 h-1/2" />
    </div>
  )
}
