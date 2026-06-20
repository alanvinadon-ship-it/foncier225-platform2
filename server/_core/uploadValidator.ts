/**
 * Upload Validation — Sprint 20 Security
 * 
 * Validates uploaded files for:
 * - Allowed extensions
 * - MIME type verification
 * - Magic bytes detection (via file-type)
 * - Maximum file size
 * - Secure filename (no double extensions, no path traversal)
 * - Rejection of executable files
 */
import { fileTypeFromBuffer } from "file-type";
import { TRPCError } from "@trpc/server";

// Allowed file configurations
const ALLOWED_TYPES: Record<string, { mimes: string[]; maxSizeMB: number }> = {
  // Documents
  ".pdf": { mimes: ["application/pdf"], maxSizeMB: 20 },
  ".docx": { mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], maxSizeMB: 20 },
  ".xlsx": { mimes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], maxSizeMB: 20 },
  // Images
  ".jpg": { mimes: ["image/jpeg"], maxSizeMB: 10 },
  ".jpeg": { mimes: ["image/jpeg"], maxSizeMB: 10 },
  ".png": { mimes: ["image/png"], maxSizeMB: 10 },
  ".webp": { mimes: ["image/webp"], maxSizeMB: 10 },
  // Audio (for voice transcription)
  ".mp3": { mimes: ["audio/mpeg"], maxSizeMB: 16 },
  ".wav": { mimes: ["audio/wav", "audio/x-wav"], maxSizeMB: 16 },
  ".webm": { mimes: ["audio/webm", "video/webm"], maxSizeMB: 16 },
  ".ogg": { mimes: ["audio/ogg"], maxSizeMB: 16 },
  ".m4a": { mimes: ["audio/mp4", "audio/x-m4a"], maxSizeMB: 16 },
};

// Dangerous extensions that should always be rejected
const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
  ".js", ".vbs", ".wsf", ".wsh", ".ps1", ".sh", ".bash",
  ".php", ".asp", ".aspx", ".jsp", ".cgi", ".py", ".rb",
  ".dll", ".sys", ".drv", ".bin", ".app",
  ".html", ".htm", ".svg", // can contain scripts
];

export interface ValidateUploadOptions {
  /** The file buffer (decoded from base64) */
  buffer: Buffer;
  /** Original filename provided by the user */
  filename: string;
  /** MIME type declared by the client */
  declaredMimeType?: string;
  /** Optional: override max size in MB */
  maxSizeMB?: number;
  /** Optional: restrict to specific extensions only */
  allowedExtensions?: string[];
}

export interface ValidatedFile {
  /** Sanitized filename */
  safeFilename: string;
  /** Verified MIME type */
  mimeType: string;
  /** File extension (lowercase, with dot) */
  extension: string;
  /** File size in bytes */
  sizeBytes: number;
}

/**
 * Validate an uploaded file for security
 * Throws TRPCError if validation fails
 */
export async function validateUpload(options: ValidateUploadOptions): Promise<ValidatedFile> {
  const { buffer, filename, declaredMimeType, maxSizeMB, allowedExtensions } = options;

  // 1. Check file size
  const sizeBytes = buffer.length;
  const sizeMB = sizeBytes / (1024 * 1024);

  // 2. Extract and validate extension
  const sanitizedName = sanitizeFilename(filename);
  const ext = getExtension(sanitizedName).toLowerCase();

  if (!ext) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Le fichier doit avoir une extension valide.",
    });
  }

  // 3. Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Type de fichier non autorisé: ${ext}`,
    });
  }

  // 4. Check double extensions (e.g., file.php.jpg)
  if (hasDoubleExtension(filename)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Nom de fichier suspect détecté (double extension).",
    });
  }

  // 5. Check if extension is in allowed list
  const effectiveAllowed = allowedExtensions || Object.keys(ALLOWED_TYPES);
  if (!effectiveAllowed.includes(ext)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Extension non autorisée: ${ext}. Extensions acceptées: ${effectiveAllowed.join(", ")}`,
    });
  }

  // 6. Check file size against type-specific or custom limit
  const typeConfig = ALLOWED_TYPES[ext];
  const effectiveMaxMB = maxSizeMB || typeConfig?.maxSizeMB || 20;
  if (sizeMB > effectiveMaxMB) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Fichier trop volumineux (${sizeMB.toFixed(1)} MB). Maximum: ${effectiveMaxMB} MB.`,
    });
  }

  // 7. Detect actual MIME type from magic bytes
  let detectedMime: string | undefined;
  try {
    const detected = await fileTypeFromBuffer(buffer);
    detectedMime = detected?.mime;
  } catch {
    // file-type may fail on some formats, continue with declared type
  }

  // 8. Determine final MIME type
  const finalMime = detectedMime || declaredMimeType || getMimeFromExtension(ext);

  // 9. Verify MIME consistency if we have type config
  if (typeConfig && detectedMime) {
    if (!typeConfig.mimes.includes(detectedMime)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Le contenu du fichier ne correspond pas à son extension (${ext}). Type détecté: ${detectedMime}`,
      });
    }
  }

  return {
    safeFilename: sanitizedName,
    mimeType: finalMime,
    extension: ext,
    sizeBytes,
  };
}

/**
 * Sanitize a filename: remove path traversal, special chars, limit length
 */
function sanitizeFilename(filename: string): string {
  // Remove path components
  let safe = filename.replace(/^.*[/\\]/, "");
  // Remove null bytes
  safe = safe.replace(/\0/g, "");
  // Replace dangerous characters
  safe = safe.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F ]/g, "_");
  // Collapse multiple dots/underscores
  safe = safe.replace(/\.{2,}/g, ".").replace(/_{2,}/g, "_");
  // Limit length
  if (safe.length > 200) {
    const ext = getExtension(safe);
    safe = safe.substring(0, 195) + ext;
  }
  return safe || "unnamed_file";
}

/**
 * Get file extension (with dot)
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return "";
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Check for suspicious double extensions
 */
function hasDoubleExtension(filename: string): boolean {
  const parts = filename.split(".");
  if (parts.length <= 2) return false;
  // Check if any non-last part is a dangerous extension
  for (let i = 1; i < parts.length - 1; i++) {
    const ext = "." + parts[i].toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      return true;
    }
  }
  return false;
}

/**
 * Get MIME type from extension as fallback
 */
function getMimeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
  };
  return map[ext] || "application/octet-stream";
}
