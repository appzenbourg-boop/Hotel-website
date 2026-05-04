/**
 * Admin property context helpers.
 * Reads from localStorage (set by PropertySwitcher component).
 * Key: 'super_admin_property_context'
 */

const STORAGE_KEY = 'super_admin_property_context'

export const getAdminContext = (): { propertyId: string } => {
    if (typeof window === 'undefined') return { propertyId: 'ALL' }
    const propertyId = localStorage.getItem(STORAGE_KEY) || 'ALL'
    return { propertyId }
}

/** Returns true when the admin is in Global Overview (no hotel selected) */
export const isGlobalContext = (): boolean => {
    if (typeof window === 'undefined') return true
    return (localStorage.getItem(STORAGE_KEY) || 'ALL') === 'ALL'
}

export const setAdminContext = (propertyId: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, propertyId)
}

export const clearAdminContext = (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
}

/**
 * Build a URL with the current property context appended as a query param.
 */
export const buildContextUrl = (
    baseUrl: string,
    params: Record<string, string | number | null | undefined> = {}
): string => {
    if (typeof window === 'undefined') return baseUrl
    const { propertyId } = getAdminContext()
    const url = new URL(baseUrl, window.location.origin)

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            url.searchParams.set(key, String(value))
        }
    })

    if (!url.searchParams.has('propertyId')) {
        url.searchParams.set('propertyId', propertyId)
    }

    return url.toString()
}
