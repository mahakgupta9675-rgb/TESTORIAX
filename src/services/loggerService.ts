/**
 * Production Logging & Security Event Service
 * Sanitizes logs and redacts sensitive data (tokens, passwords, keys).
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'security';

export interface SecurityEvent {
  eventType: string;
  userId?: string;
  details?: Record<string, any>;
  timestamp: string;
}

const REDACT_KEYS = ['password', 'token', 'access_token', 'refresh_token', 'key', 'secret', 'apikey', 'auth'];

/**
 * Deep redaction helper to sanitize objects before logging
 */
function sanitizePayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizePayload);
  }

  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (REDACT_KEYS.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitizePayload(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
}

class LoggerService {
  private isProduction = import.meta.env.PROD;

  info(message: string, context?: Record<string, any>) {
    const cleanContext = sanitizePayload(context);
    if (!this.isProduction) {
      console.log(`[INFO] ${message}`, cleanContext || '');
    }
  }

  warn(message: string, context?: Record<string, any>) {
    const cleanContext = sanitizePayload(context);
    console.warn(`[WARN] ${message}`, cleanContext || '');
  }

  error(message: string, error?: any, context?: Record<string, any>) {
    const cleanContext = sanitizePayload(context);
    const sanitizedError = error instanceof Error 
      ? { name: error.name, message: error.message }
      : sanitizePayload(error);

    console.error(`[ERROR] ${message}`, sanitizedError, cleanContext || '');
  }

  /**
   * Log critical security events (e.g. tab switches during exams, unauthorized admin attempts)
   */
  logSecurityEvent(eventType: string, userId?: string, details?: Record<string, any>) {
    const event: SecurityEvent = {
      eventType,
      userId: userId || 'anonymous',
      details: sanitizePayload(details),
      timestamp: new Date().toISOString()
    };

    console.warn(`[SECURITY EVENT] [${eventType}] User: ${event.userId}`, event.details);
    // In production, this can also post to a telemetry/monitoring endpoint or Supabase audit log
  }
}

export const logger = new LoggerService();
export default logger;
