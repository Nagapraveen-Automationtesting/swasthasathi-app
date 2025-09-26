// Centralized logging utility
import { ENABLE_CONSOLE_LOGS, ENABLE_DEBUG_MODE } from '../assets/Constants';

class Logger {
  constructor() {
    this.isEnabled = ENABLE_CONSOLE_LOGS;
    this.isDebugMode = ENABLE_DEBUG_MODE;
  }

  // Info level logging
  info(message, ...args) {
    if (this.isEnabled) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  // Error level logging (always shown)
  error(message, ...args) {
    console.error(`❌ [ERROR] ${message}`, ...args);
  }

  // Warning level logging
  warn(message, ...args) {
    if (this.isEnabled) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }

  // Success level logging
  success(message, ...args) {
    if (this.isEnabled) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }

  // Debug level logging (only in debug mode)
  debug(message, ...args) {
    if (this.isEnabled && this.isDebugMode) {
      console.log(`🐛 [DEBUG] ${message}`, ...args);
    }
  }

  // API request logging
  apiRequest(method, url, data = null) {
    if (this.isEnabled) {
      console.log(`📤 [API] ${method.toUpperCase()} ${url}`, data ? { data } : '');
    }
  }

  // API response logging
  apiResponse(method, url, status, data = null) {
    if (this.isEnabled) {
      const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`📥 [API] ${statusIcon} ${method.toUpperCase()} ${url} (${status})`, data ? { data } : '');
    }
  }

  // Authentication logging
  auth(message, ...args) {
    if (this.isEnabled) {
      console.log(`🔐 [AUTH] ${message}`, ...args);
    }
  }

  // File upload logging
  upload(message, ...args) {
    if (this.isEnabled) {
      console.log(`📁 [UPLOAD] ${message}`, ...args);
    }
  }

  // Group logging for related operations
  group(label, callback) {
    if (this.isEnabled) {
      console.group(`🔍 ${label}`);
      try {
        callback();
      } finally {
        console.groupEnd();
      }
    } else {
      callback();
    }
  }

  // Time tracking for performance
  time(label) {
    if (this.isEnabled && this.isDebugMode) {
      console.time(`⏱️ ${label}`);
    }
  }

  timeEnd(label) {
    if (this.isEnabled && this.isDebugMode) {
      console.timeEnd(`⏱️ ${label}`);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const { info, error, warn, success, debug, apiRequest, apiResponse, auth, upload, group, time, timeEnd } = logger;

