/**
 * Input Sanitization — Sprint 20 Security
 * 
 * Protects against XSS and HTML injection while preserving
 * useful characters (accents, special chars for French text).
 * 
 * Strategy:
 * - Strip dangerous HTML tags and attributes
 * - Preserve safe text content
 * - Keep accented characters, punctuation, and formatting
 * - Apply to all user-facing text inputs via tRPC middleware
 */
import xss from "xss";

// XSS filter options: strip all HTML tags
const xssOptions = {
  whiteList: {} as Record<string, string[]>,
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "noscript"] as string[],
  onIgnoreTagAttr: () => "",
};

/**
 * Sanitize a single string value
 * Removes XSS vectors while preserving normal text
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return input;
  
  // Apply XSS filter
  let sanitized = xss(input, xssOptions);
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  
  // Trim excessive whitespace but keep single newlines
  sanitized = sanitized.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  
  return sanitized.trim();
}

/**
 * Recursively sanitize all string values in an object
 * Used by tRPC middleware to sanitize all inputs
 */
export function sanitizeInput<T>(input: T): T {
  if (input === null || input === undefined) return input;
  
  if (typeof input === "string") {
    return sanitizeString(input) as unknown as T;
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item)) as unknown as T;
  }
  
  if (typeof input === "object" && input !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      // Skip sanitization for specific fields that should remain raw
      if (key === "fileBase64" || key === "password" || key === "token") {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeInput(value);
      }
    }
    return sanitized as T;
  }
  
  return input;
}
