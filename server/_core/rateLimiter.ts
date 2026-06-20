/**
 * Rate Limiting Configuration — Sprint 20 Security
 * 
 * Protects API endpoints against brute force, abuse, and overload.
 * Different limits for different endpoint types:
 * - Auth endpoints: strict (10 req/min)
 * - Upload endpoints: moderate (20 req/min)
 * - ERP API: standard (100 req/min)
 * - Public endpoints: relaxed (200 req/min)
 */
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

// Standard error response
function rateLimitResponse(_req: Request, res: Response) {
  res.status(429).json({
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Trop de requêtes. Veuillez réessayer dans quelques instants.",
      retryAfter: res.getHeader("Retry-After"),
    },
  });
}

/**
 * Global rate limiter for all API routes
 * 100 requests per minute per IP
 */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
  skip: (req) => {
    // Skip health checks
    return req.path === "/healthz";
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 10 requests per minute per IP
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});

/**
 * Upload rate limiter
 * 20 requests per minute per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});

/**
 * Webhook/scheduled endpoints — more relaxed for internal calls
 * 50 requests per minute per IP
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});
