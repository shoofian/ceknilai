// Simple in-memory sliding-window rate limiter per serverless instance.
// Helps mitigate brute-force and accidental request bursts.

const buckets = new Map();
const MAX_BUCKETS = 5000;

function cleanupExpired(now) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [k, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(k);
    }
  }
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export function checkRateLimit(key, { limit = 30, windowMs = 60_000 } = {}) {
  const now = Date.now();
  cleanupExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const entry = { count: 1, resetAt: now + windowMs };
    buckets.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}
