'use client'

import { ShieldAlert } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface PermissionGateProps {
    /** Permission ID to check e.g. 'view_reservations', 'create_reservation' */
    permission: string
    /** If true, shows a "no access" message instead of hiding */
    showDenied?: boolean
    children: React.ReactNode
}

export default function PermissionGate({ permission, showDenied = false, children }: PermissionGateProps) {
    const { can, isAdmin, loading } = usePermissions()

    // While loading, render children (avoids flash of "no access")
    if (loading || isAdmin) return <>{children}</>

    if (can(permission)) return <>{children}</>

    if (!showDenied) return null

    return (
        <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <p className="text-xs text-rose-400 font-medium">
                You don&apos;t have permission to access this. Contact your hotel admin.
            </p>
        </div>
    )
}
