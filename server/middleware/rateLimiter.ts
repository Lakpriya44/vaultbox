import { Request, Response, NextFunction } from 'express';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export const createRateLimiter = (options: { windowMs: number; max: number; message?: string }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(ip, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        error: options.message || 'Too many requests. Please try again later.',
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    bucket.count += 1;
    next();
  };
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 50,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});
