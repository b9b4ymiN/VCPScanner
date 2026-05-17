export class TokenBucket {
  private tokens: number
  private lastRefill: number

  constructor(
    private capacity: number, // max tokens
    private refillRateMs: number, // ms per token
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const added = Math.floor(elapsed / this.refillRateMs)
    if (added > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + added)
      this.lastRefill = now
    }
  }

  async acquire(): Promise<void> {
    while (true) {
      this.refill()
      if (this.tokens >= 1) {
        this.tokens -= 1
        return
      }
      await new Promise(r => setTimeout(r, this.refillRateMs))
    }
  }
}

// Yahoo Finance: ~5 req/s sustained, 60 burst
export const yahooBucket = new TokenBucket(60, 200) // 1 token per 200ms
