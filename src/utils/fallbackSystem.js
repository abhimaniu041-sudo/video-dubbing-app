// Universal Fallback System for All AI Services

export class FallbackChain {
  constructor(serviceName, apis) {
    this.serviceName = serviceName;
    this.apis = apis;
    this.currentIndex = 0;
    this.failedApis = new Set();
    this.successCounts = {};
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      fallbacksUsed: 0
    };
  }
  
  async execute(params) {
    this.stats.totalRequests++;
    
    for (let i = 0; i < this.apis.length; i++) {
      const api = this.apis[i];
      
      if (this.failedApis.has(api.name)) {
        // Try failed APIs again after cooldown (5 minutes)
        const failedAt = this.failedApis.get(api.name);
        if (Date.now() - failedAt < 300000) continue;
      }
      
      try {
        console.log(`[${this.serviceName}] Trying: ${api.name}`);
        const result = await Promise.race([
          api.execute(params),
          this.timeout(api.timeoutMs || 30000)
        ]);
        
        if (result?.success) {
          this.successCounts[api.name] = (this.successCounts[api.name] || 0) + 1;
          this.stats.successfulRequests++;
          if (i > 0) this.stats.fallbacksUsed++;
          return result;
        }
      } catch (error) {
        console.log(`[${this.serviceName}] ${api.name} failed: ${error.message}`);
        
        if (api.markFailedOnError) {
          this.failedApis.set(api.name, Date.now());
        }
      }
    }
    
    throw new Error(`[${this.serviceName}] All APIs failed. Stats: ${JSON.stringify(this.stats)}`);
  }
  
  timeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }
  
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100)
        : 0,
      apiHealth: Object.fromEntries(
        this.apis.map(api => [
          api.name,
          {
            successes: this.successCounts[api.name] || 0,
            failed: this.failedApis.has(api.name)
          }
        ])
      )
    };
  }
  
  reset() {
    this.failedApis.clear();
    this.currentIndex = 0;
  }
}

// Rate Limiter to prevent API abuse
export class RateLimiter {
  constructor(requestsPerMinute) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }
  
  async throttle() {
    const now = Date.now();
    const windowStart = now - 60000;
    
    this.requests = this.requests.filter(time => time > windowStart);
    
    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest) + 100;
      
      console.log(`Rate limit hit, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(Date.now());
  }
}

// Cache for expensive API calls
export class APICache {
  constructor(ttlMinutes = 60) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  clear() {
    this.cache.clear();
  }
}

// Global instances
export const translationCache = new APICache(120); // 2 hour cache
export const ttsCache = new APICache(60); // 1 hour cache
export const transcriptionCache = new APICache(24 * 60); // 24 hour cache

// Retry with exponential backoff
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Retry attempt ${attempt + 1} after ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
