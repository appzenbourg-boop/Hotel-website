'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Building2, ChevronDown, Check, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Property {
    id: string
    name: string
}

export default function PropertySwitcher() {
    const { data: session } = useSession()
    const [properties, setProperties] = useState<Property[]>([])
    const [isOpen, setIsOpen] = useState(false)

    // Use session storage or global state to persist context
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL')

    useEffect(() => {
        if (session?.user?.role === 'SUPER_ADMIN') {
            fetchProperties()

            // Load saved context
            const saved = localStorage.getItem('super_admin_property_context')
            if (saved) setSelectedPropertyId(saved)
        }
    }, [session])

    const fetchProperties = async () => {
        try {
            const res = await fetch('/api/admin/properties')
            if (res.ok) {
                const data = await res.json()
                // Handle both raw array and { success, data } formats
                const list = Array.isArray(data) ? data : (data?.data ?? [])
                setProperties(list)
            }
        } catch (error) {
            console.error('Failed to fetch properties:', error)
        }
    }

    const handleSelect = (id: string) => {
        setSelectedPropertyId(id)
        localStorage.setItem('super_admin_property_context', id)
        setIsOpen(false)
        // Dispatch custom event so other components know to refresh
        window.dispatchEvent(new CustomEvent('propertyContextChange', { detail: id }))
        // Refresh page to apply context globally
        window.location.reload()
    }

    if (session?.user?.role !== 'SUPER_ADMIN') return null

    const selectedProperty = properties.find(p => p.id === selectedPropertyId)

    return (
        <div className="relative">
            <button
                data-property-switcher
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-light border border-border hover:bg-border transition-colors outline-none"
            >
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                    {selectedPropertyId === 'ALL' ? 'Global Overview' : selectedProperty?.name || 'Loading...'}
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl z-20 py-1 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                            Select Property Context
                        </div>

                        <button
                            onClick={() => handleSelect('ALL')}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-surface-light transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-primary" />
                                <span>All Properties (Global)</span>
                            </div>
                            {selectedPropertyId === 'ALL' && <Check className="w-4 h-4 text-primary" />}
                        </button>

                        <div className="h-px bg-border my-1" />

                        {properties.map((property) => (
                            <button
                                key={property.id}
                                onClick={() => handleSelect(property.id)}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-surface-light transition-colors text-left"
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Building2 className="w-4 h-4 text-text-secondary" />
                                    <span className="truncate">{property.name}</span>
                                </div>
                                {selectedPropertyId === property.id && <Check className="w-4 h-4 text-primary" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
