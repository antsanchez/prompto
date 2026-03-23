// Storage key prefixes
export const STORAGE_KEYS = {
  CHAT: 'chat_',
  ARENA: 'arena_',
  DISCUSSION: 'discussion_',
  TEMPLATES: 'templates',
  SETTINGS: 'settings',
  THEME: 'theme'
} as const;

// UI Constants
export const UI = {
  DESKTOP_BREAKPOINT: 1024
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1/models',
  ANTHROPIC: 'https://api.anthropic.com/v1/models',
  MISTRAL: 'https://api.mistralai.com/v1/models',
  COHERE: 'https://api.cohere.ai/v1/models',
  GOOGLE_V1: 'https://generativelanguage.googleapis.com/v1/models',
  GOOGLE_V1BETA: 'https://generativelanguage.googleapis.com/v1beta/models',
  XAI: 'https://api.x.ai/v1/models'
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'There was an error with your request. Please check your connection and settings and try again.',
  MODELS_FETCH: 'There was an error getting the models. Please make sure all settings are correct and try again.',
  ARENA_START: 'There was an error starting the arena. Please try again.',
  ARENA_LOAD: 'There was an error loading the arena from the URL. Please try again.',
  ARENA_CHAT: 'There was an error chatting in the arena. Please try again.',
  NO_API_KEY: 'No API key',
  FILE_TOO_LARGE: 'File exceeds maximum size limit',
  UNSUPPORTED_FILE_TYPE: 'File type not supported',
  MAX_ATTACHMENTS_REACHED: 'Maximum number of attachments reached'
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,  // 10MB
  MAX_PDF_SIZE: 20 * 1024 * 1024,    // 20MB
  MAX_ATTACHMENTS: 5,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_PDF_TYPES: ['application/pdf']
} as const;

// Default values
export const DEFAULTS = {
  TEMPERATURE: 0.7,
  UNTITLED_CHAT: 'Untitled Chat',
  UNTITLED_ARENA: 'Untitled Arena',
  UNTITLED_DISCUSSION: 'Untitled Discussion'
} as const;
