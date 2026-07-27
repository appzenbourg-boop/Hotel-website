import Razorpay from 'razorpay'
import { prisma } from '@/lib/db'

const defaultKeyId = (process.env.RAZORPAY_KEY_ID || '').trim()
const defaultKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()

export const razorpay = new Razorpay({
    key_id: defaultKeyId,
    key_secret: defaultKeySecret,
})

/**
 * Dynamically resolves Razorpay client & Key ID for a given propertyId if configured by hotel owner in Settings,
 * falling back to global environment variables.
 */
export async function getRazorpayForProperty(propertyId?: string) {
    if (propertyId) {
        try {
            // 1. Check OtaConnection for RAZORPAY
            const conn = await prisma.otaConnection.findUnique({
                where: {
                    propertyId_otaName: {
                        propertyId,
                        otaName: 'RAZORPAY',
                    },
                },
            })

            if (conn && conn.status === 'CONNECTED' && conn.credentials) {
                const creds = conn.credentials as any
                const keyId = (creds.keyId || creds.key_id || creds.razorpayKeyId || '').toString().trim()
                const keySecret = (creds.keySecret || creds.key_secret || creds.razorpayKeySecret || '').toString().trim()

                if (keyId && keySecret) {
                    return {
                        client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
                        keyId,
                        keySecret,
                        isCustom: true,
                    }
                }
            }

            // 2. Fallback to PropertySettings
            const settings = await prisma.propertySettings.findUnique({
                where: { propertyId },
                select: { razorpayKeyId: true, razorpayKeySecret: true },
            })

            if (settings?.razorpayKeyId && settings?.razorpayKeySecret) {
                const keyId = settings.razorpayKeyId.trim()
                const keySecret = settings.razorpayKeySecret.trim()
                if (keyId && keySecret) {
                    return {
                        client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
                        keyId,
                        keySecret,
                        isCustom: true,
                    }
                }
            }
        } catch (err) {
            console.error('[RAZORPAY] Error resolving custom property credentials:', err)
        }
    }

    return {
        client: razorpay,
        keyId: defaultKeyId,
        keySecret: defaultKeySecret,
        isCustom: false,
    }
}
