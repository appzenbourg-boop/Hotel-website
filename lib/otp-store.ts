export interface StoredOtp {
  code: string
  expiresAt: number
}

// Global fallback in-memory store for OTPs when Redis is unavailable
const globalForOtp = global as unknown as { otpMemoryStore?: Map<string, StoredOtp> }

export const otpMemoryStore = globalForOtp.otpMemoryStore ?? new Map<string, StoredOtp>()

if (process.env.NODE_ENV !== 'production') {
  globalForOtp.otpMemoryStore = otpMemoryStore
}
