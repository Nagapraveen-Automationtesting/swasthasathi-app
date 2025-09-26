// Environment-based configuration
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/';
export const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000;
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Swasthasathi Health Platform';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
export const APP_BASE_PATH = import.meta.env.VITE_APP_BASE_PATH || '/swasthasathi-app';

// Feature flags
export const ENABLE_CONSOLE_LOGS = import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true';
export const ENABLE_DEBUG_MODE = import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true';

// File upload configuration
export const MAX_FILE_SIZE_MB = parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 3;
export const ALLOWED_FILE_TYPES = (import.meta.env.VITE_ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png').split(',');

// PDF.js configuration
export const PDFJS_WORKER_URL = import.meta.env.VITE_PDFJS_WORKER_URL || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
export const PDFJS_CMAP_URL = import.meta.env.VITE_PDFJS_CMAP_URL || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/';