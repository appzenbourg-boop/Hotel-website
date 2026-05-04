'use client'

import { Fragment, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  footer?: ReactNode
  showClose?: boolean
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  footer,
  showClose = true,
}: ModalProps) {
  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            'relative w-full bg-surface border border-border rounded-lg shadow-xl',
            'transform transition-all animate-fade-in',
            sizeStyles[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showClose) && (
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                {title && (
                  <h3 className="text-xl font-semibold text-text-primary">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {description}
                  </p>
                )}
              </div>
              {showClose && (
                <button
                  onClick={onClose}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-light">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
