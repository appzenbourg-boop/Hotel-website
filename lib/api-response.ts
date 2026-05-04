import { NextResponse } from 'next/server'

/**
 * Standardized API response helpers.
 * All API routes should use these instead of raw NextResponse.json().
 */

export function ok<T>(data: T, status = 200) {
    return NextResponse.json({ success: true, data }, { status })
}

export function created<T>(data: T) {
    return NextResponse.json({ success: true, data }, { status: 201 })
}

export function noContent() {
    return new NextResponse(null, { status: 204 })
}

export function badRequest(message: string, details?: unknown) {
    return NextResponse.json(
        { success: false, error: message, ...(details ? { details } : {}) },
        { status: 400 }
    )
}

export function unauthorized(message = 'Unauthorized. Please login.') {
    return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden. Insufficient permissions.') {
    return NextResponse.json({ success: false, error: message }, { status: 403 })
}

export function notFound(resource = 'Resource') {
    return NextResponse.json(
        { success: false, error: `${resource} not found.` },
        { status: 404 }
    )
}

export function conflict(message: string) {
    return NextResponse.json({ success: false, error: message }, { status: 409 })
}

export function tooManyRequests(resetAt: number) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
    return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        {
            status: 429,
            headers: { 'Retry-After': String(retryAfter) },
        }
    )
}

export function serverError(error: unknown, context?: string) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (context) console.error(`[${context}]`, error)
    else console.error('[SERVER_ERROR]', error)

    return NextResponse.json(
        { success: false, error: 'Internal server error.' },
        { status: 500 }
    )
}
