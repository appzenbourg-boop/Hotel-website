import twilio from 'twilio';
import dns from 'node:dns';
import { prisma } from '@/lib/db';

// Force Node to prefer IPv4 for DNS resolution (fixes ENOTFOUND on some Windows networks)
dns.setDefaultResultOrder('ipv4first');

const cleanEnv = (val: string | undefined) => {
    if (!val) return val;
    return val.replace(/['"]+/g, '').trim();
};

const defaultAccountSid = cleanEnv(process.env.TWILIO_ACCOUNT_SID);
const defaultAuthToken = cleanEnv(process.env.TWILIO_AUTH_TOKEN);
const defaultVerifyServiceSid = cleanEnv(process.env.TWILIO_VERIFY_SERVICE_SID);

const defaultClient = twilio(defaultAccountSid, defaultAuthToken);

const formatPhone = (phone: string) => {
    // Remove all non-numeric characters
    const clean = phone.replace(/\D/g, '');
    // If it's 10 digits, assume India (+91)
    if (clean.length === 10) return `+91${clean}`;
    // Else ensure it starts with +
    return phone.startsWith('+') ? phone : `+${clean}`;
};

/**
 * Dynamically resolves Twilio credentials for a given propertyId if configured by hotel owner in Settings,
 * falling back to global environment variables.
 */
export async function getTwilioClientForProperty(propertyId?: string) {
    if (propertyId) {
        try {
            const conn = await prisma.otaConnection.findUnique({
                where: {
                    propertyId_otaName: {
                        propertyId,
                        otaName: 'TWILIO',
                    },
                },
            });

            if (conn && conn.status === 'CONNECTED' && conn.credentials) {
                const creds = conn.credentials as any;
                const sid = cleanEnv(creds.accountSid);
                const token = cleanEnv(creds.authToken);
                const phone = cleanEnv(creds.phoneNumber);
                const whatsapp = cleanEnv(creds.whatsappNumber);

                if (sid && token) {
                    return {
                        client: twilio(sid, token),
                        accountSid: sid,
                        phoneNumber: phone || process.env.TWILIO_PHONE_NUMBER,
                        whatsappNumber: whatsapp || process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886',
                        isCustom: true,
                    };
                }
            }
        } catch (err) {
            console.error('[TWILIO] Error fetching property credentials:', err);
        }
    }

    return {
        client: defaultClient,
        accountSid: defaultAccountSid,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886',
        isCustom: false,
    };
}

export const sendOTP = async (phone: string, propertyId?: string) => {
    const formattedPhone = formatPhone(phone);
    const tw = await getTwilioClientForProperty(propertyId);

    if (tw.accountSid === 'mock' || !tw.accountSid) {
        console.log(`[TWILIO] Mock OTP sent to ${formattedPhone}`);
        return { success: true, sid: 'mock-sid' };
    }

    try {
        const verification = await tw.client.verify.v2
            .services(defaultVerifyServiceSid!)
            .verifications.create({ to: formattedPhone, channel: 'sms' });
        return { success: true, sid: verification.sid };
    } catch (error) {
        console.error('Twilio Send OTP Error:', error);
        throw error;
    }
};

export const verifyOTP = async (phone: string, code: string, propertyId?: string) => {
    const formattedPhone = formatPhone(phone);
    const tw = await getTwilioClientForProperty(propertyId);

    if (tw.accountSid === 'mock' || !tw.accountSid) {
        console.log(`[TWILIO] Mock OTP verify for ${formattedPhone}: ${code}`);
        return { status: 'approved' };
    }

    try {
        const verificationCheck = await tw.client.verify.v2
            .services(defaultVerifyServiceSid!)
            .verificationChecks.create({ to: formattedPhone, code });
        return verificationCheck;
    } catch (error) {
        console.error('Twilio Verify OTP Error:', error);
        throw error;
    }
};

export const sendSMS = async (to: string, message: string, propertyId?: string) => {
    const formattedPhone = formatPhone(to);
    const tw = await getTwilioClientForProperty(propertyId);

    if (tw.accountSid === 'mock' || !tw.accountSid) {
        console.log(`[TWILIO] Mock SMS to ${formattedPhone}: ${message}`);
        return { sid: 'mock-sms-sid' };
    }

    try {
        const result = await tw.client.messages.create({
            body: message,
            from: tw.phoneNumber,
            to: formattedPhone,
        });
        return result;
    } catch (error) {
        console.error('Twilio Send SMS Error:', error);
        throw error;
    }
};

export const sendWhatsApp = async (to: string, message: string, propertyId?: string) => {
    const formattedPhone = formatPhone(to);
    const tw = await getTwilioClientForProperty(propertyId);

    if (tw.accountSid === 'mock' || !tw.accountSid) {
        console.log(`[TWILIO] Mock WhatsApp to ${formattedPhone}: ${message}`);
        return { sid: 'mock-whatsapp-sid' };
    }

    try {
        const result = await tw.client.messages.create({
            body: message,
            from: `whatsapp:${tw.whatsappNumber}`,
            to: `whatsapp:${formattedPhone}`,
        });
        return result;
    } catch (error) {
        console.error('Twilio Send WhatsApp Error:', error);
        throw error;
    }
};
