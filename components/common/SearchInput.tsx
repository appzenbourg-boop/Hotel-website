'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { cn, debounce } from '@/lib/utils'

export interface SearchInputProps {
  placeholder?: string
  onSearch: (value: string) => void
  debounceMs?: number
  className?: string
}

export default function SearchInput({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    const debouncedSearch = debounce(() => {
      onSearch(value)
    }, debounceMs)

    debouncedSearch()
  }, [value, onSearch, debounceMs])

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-surface-light border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
