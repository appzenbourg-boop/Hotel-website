import { Redis } from '@upstash/redis'

const rawRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Safeguard wrapper to prevent total API failure if Upstash crashes/timeouts
export const redis = {
  async get(key: string) {
    try { return await rawRedis.get(key); } 
    catch (e) { console.error(`[Redis Error] GET ${key}:`, e); return null; }
  },
  async set(key: string, value: any, options?: any) {
    try { return await rawRedis.set(key, value, options); } 
    catch (e) { console.error(`[Redis Error] SET ${key}:`, e); return null; }
  },
  async del(...keys: string[]) {
    try { 
      if (!keys || keys.length === 0) return 0;
      return await rawRedis.del(...keys); 
    } 
    catch (e) { console.error(`[Redis Error] DEL keys:`, e); return null; }
  },
  async keys(pattern: string) {
    try { return await rawRedis.keys(pattern); }
    catch (e) { console.error(`[Redis Error] KEYS ${pattern}:`, e); return []; }
  }
} as any;
