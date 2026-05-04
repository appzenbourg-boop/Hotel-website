import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export default function Loading({ size = 'md', text, className }: LoadingProps) {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeStyles[size])} />
      {text && <p className="text-sm text-text-secondary">{text}</p>}
    </div>
  )
}
