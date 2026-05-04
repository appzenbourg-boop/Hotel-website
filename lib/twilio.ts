import twilio from 'twilio';
import dns from 'node:dns';

// Force Node to prefer IPv4 for DNS resolution (fixes ENOTFOUND on some Windows networks)
dns.setDefaultResultOrder('ipv4first');

const cleanEnv = (val: string | undefined) => {
    if (!val) return val;
    return val.replace(/['"]+/g, '').trim();
};

const accountSid = cleanEnv(process.env.TWILIO_ACCOUNT_SID);
const authToken = cleanEnv(process.env.TWILIO_AUTH_TOKEN);
const verifyServiceSid = cleanEnv(process.env.TWILIO_VERIFY_SERVICE_SID);

const client = twilio(accountSid, authToken);

const formatPhone = (phone: string) => {
    // Remove all non-numeric characters
    const clean = phone.replace(/\D/g, '');
    // If it's 10 digits, assume India (+91)
    if (clean.length === 10) return `+91${clean}`;
    // Else ensure it starts with +
    return phone.startsWith('+') ? phone : `+${clean}`;
};

export const sendOTP = async (phone: string) => {
    const formattedPhone = formatPhone(phone);
    if (accountSid === 'mock' || !accountSid) {
        console.log(`[TWILIO] Mock OTP sent to ${formattedPhone}`);
        return { success: true, sid: 'mock-sid' };
    }

    try {
        const verification = await client.verify.v2
            .services(verifyServiceSid!)
            .verifications.create({ to: formattedPhone, channel: 'sms' });
        return { success: true, sid: verification.sid };
    } catch (error) {
        console.error('Twilio Send OTP Error:', error);
        throw error;
    }
};

export const verifyOTP = async (phone: string, code: string) => {
    const formattedPhone = formatPhone(phone);
    if (accountSid === 'mock' || !accountSid) {
        console.log(`[TWILIO] Mock OTP verify for ${formattedPhone}: ${code}`);
        return { status: 'approved' };
    }

    try {
        const verificationCheck = await client.verify.v2
            .services(verifyServiceSid!)
            .verificationChecks.create({ to: formattedPhone, code });
        return verificationCheck;
    } catch (error) {
        console.error('Twilio Verify OTP Error:', error);
        throw error;
    }
};

export const sendSMS = async (to: string, message: string) => {
    const formattedPhone = formatPhone(to);
    if (accountSid === 'mock' || !accountSid) {
        console.log(`[TWILIO] Mock SMS to ${formattedPhone}: ${message}`);
        return { sid: 'mock-sms-sid' };
    }

    try {
        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
        });
        return result;
    } catch (error) {
        console.error('Twilio Send SMS Error:', error);
        throw error;
    }
};

export const sendWhatsApp = async (to: string, message: string) => {
    const formattedPhone = formatPhone(to);
    const fromPhone = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'; // Default Twilio sandbox number

    if (accountSid === 'mock' || !accountSid) {
        console.log(`[TWILIO] Mock WhatsApp to ${formattedPhone}: ${message}`);
        return { sid: 'mock-whatsapp-sid' };
    }

    try {
        const result = await client.messages.create({
            body: message,
            from: `whatsapp:${fromPhone}`,
            to: `whatsapp:${formattedPhone}`
        });
        return result;
    } catch (error) {
        console.error('Twilio Send WhatsApp Error:', error);
        throw error;
    }
};

