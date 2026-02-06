import Redis from "ioredis";

// Simple in-memory Redis mock for development without external Redis
class MockRedis {
  private store = new Map<string, string>();
  private expiry = new Map<string, number>();

  constructor() {
    console.log("[Redis] Initializing Mock Redis (In-Memory)");
  }

  async get(key: string) {
    const exp = this.expiry.get(key);
    if (exp && Date.now() > exp) {
      await this.del(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, mode?: string, duration?: number) {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      this.expiry.set(key, Date.now() + duration * 1000);
    }
    return 'OK';
  }

  async del(key: string) {
    this.store.delete(key);
    this.expiry.delete(key);
    return 1;
  }
  
  // Basic setnx simulation
  async setnx(key: string, value: string) {
    const existing = await this.get(key);
    if (existing) return 0;
    await this.set(key, value);
    return 1;
  }

  // Basic implementation of incr for rate limiting
  async incr(key: string) {
    const val = await this.get(key);
    const num = val ? parseInt(val, 10) : 0;
    const next = num + 1;
    await this.set(key, next.toString());
    return next;
  }

  // Basic implementation of expire
  async expire(key: string, seconds: number) {
    const val = this.store.get(key);
    if (!val) return 0;
    this.expiry.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  on(event: string, callback: () => void) {
    // No-op for mock
    return this;
  }
}

export const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL) 
  : new MockRedis() as unknown as Redis;

export const isMockRedis = !process.env.REDIS_URL;

if (isMockRedis) {
  console.warn("WARN: REDIS_URL not provided. Using in-memory mock. Rate limiting and caching will reset on restart.");
}
