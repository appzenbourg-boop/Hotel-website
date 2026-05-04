import { getStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

export interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge', getStatusColor(status), className)}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
