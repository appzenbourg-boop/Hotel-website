'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { planHasFeature, planMeetsRequirement, type PlanTier } from '@/lib/plan-features'
import { isFeatureActiveForProperty, normalizePropertyFeatures } from '@/lib/master-features'

export type PermissionMap = Record<string, boolean>

interface UsePermissionsReturn {
    permissions: PermissionMap
    can: (permissionId: string) => boolean
    isAdmin: boolean
    role: string
    plan: string
    features: string[]
    hasFeature: (featureKey: string) => boolean
    planMeets: (minPlan: PlanTier) => boolean
    loading: boolean
}

let _cache: { propertyId: string; role: string; data: PermissionMap } | null = null

export function usePermissions(): UsePermissionsReturn {
    const { data: session } = useSession()
    const [permissions, setPermissions] = useState<PermissionMap>({})
    const [plan, setPlan] = useState<string>('BASE')
    const [features, setFeatures] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    const role = session?.user?.role ?? ''
    const propertyId = session?.user?.propertyId ?? ''
    const isAdmin = role === 'SUPER_ADMIN' || role === 'HOTEL_ADMIN'

    const fetchPermissions = useCallback(async () => {
        if (!propertyId || propertyId === 'ALL') { setLoading(false); return }
        if (isAdmin) { setLoading(false); return }

        if (_cache && _cache.propertyId === propertyId && _cache.role === role) {
            setPermissions(_cache.data)
            setLoading(false)
            return
        }

        try {
            const res = await fetch(`/api/admin/settings/roles?propertyId=${propertyId}`)
            if (res.ok) {
                const json = await res.json()
                const rolePerms = (json.rolePermissions ?? []).find((rp: any) => rp.role === role)
                const perms: PermissionMap = rolePerms?.permissions ?? {}
                _cache = { propertyId, role, data: perms }
                setPermissions(perms)
            }
        } catch { /* silent */ } finally { setLoading(false) }
    }, [propertyId, role, isAdmin])

    const fetchPlanAndFeatures = useCallback(async () => {
        if (!propertyId || propertyId === 'ALL') return
        try {
            const res = await fetch(`/api/admin/settings/property?propertyId=${propertyId}`)
            if (res.ok) {
                const json = await res.json()
                const p = json.data?.plan ?? json.property?.plan
                const f = json.data?.features ?? json.property?.features
                if (p) setPlan(p)
                if (Array.isArray(f)) {
                    setFeatures(normalizePropertyFeatures(f, p))
                }
            }
        } catch { /* silent */ }
    }, [propertyId])

    useEffect(() => {
        if (session) {
            fetchPermissions()
            fetchPlanAndFeatures()
        }
    }, [session, fetchPermissions, fetchPlanAndFeatures])

    // Listen for plan or feature updates
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (!detail?.propertyId || detail.propertyId === propertyId) {
                if (detail?.plan) setPlan(detail.plan)
                if (detail?.features && Array.isArray(detail.features)) {
                    setFeatures(normalizePropertyFeatures(detail.features, detail.plan || plan))
                }
                if (!detail?.plan && !detail?.features) fetchPlanAndFeatures()
            }
        }
        const rolesHandler = (e: Event) => {
            _cache = null
            fetchPermissions()
        }
        const onFocus = () => {
            _cache = null
            fetchPermissions()
        }
        window.addEventListener('planUpgraded', handler)
        window.addEventListener('featuresUpdated', handler)
        window.addEventListener('rolePermissionsUpdated', rolesHandler)
        window.addEventListener('focus', onFocus)

        // Poll every 45 seconds so permission changes by the owner propagate to active sessions
        const interval = setInterval(() => {
            _cache = null
            fetchPermissions()
        }, 45000)

        return () => {
            window.removeEventListener('planUpgraded', handler)
            window.removeEventListener('featuresUpdated', handler)
            window.removeEventListener('rolePermissionsUpdated', rolesHandler)
            window.removeEventListener('focus', onFocus)
            clearInterval(interval)
        }
    }, [propertyId, plan, fetchPlanAndFeatures, fetchPermissions])

    const can = useCallback((permissionId: string): boolean => {
        if (isAdmin) return true
        const val = permissions[permissionId]
        if (typeof val === 'boolean') return val
        return val === 'READ' || val === 'READ_WRITE'
    }, [isAdmin, permissions])

    const hasFeature = useCallback((featureKey: string): boolean => {
        if (role === 'SUPER_ADMIN') return true
        if (featureKey === 'dashboard') return true
        return isFeatureActiveForProperty(features, featureKey, plan)
    }, [plan, role, features])

    const planMeets = useCallback((minPlan: PlanTier): boolean => {
        if (role === 'SUPER_ADMIN') return true
        return planMeetsRequirement(plan, minPlan)
    }, [plan, role])

    return { permissions, can, isAdmin, role, plan, features, hasFeature, planMeets, loading }
}
