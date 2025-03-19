// Re-export all schema types
export * from './schemas'

// Client configuration types
export interface AuthavaConfig {
  domain: string
  resolverDomain?: string
  secure?: boolean
  autoRefresh?: boolean
  refreshBuffer?: number
  customHeaders?: Record<string, string> | (() => Record<string, string>)
  debug?: boolean
}

// Session types
export interface AuthavaUser {
  id: string
  email: string
  [key: string]: any
}

export type AuthavaResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

export interface AuthavaSession {
  user: AuthavaUser
  redirect_url: string
}

export type SessionStatus = 'valid' | 'refreshing' | 'expired' | 'error'

export interface SessionState {
  status: SessionStatus
  user: AuthavaUser | null
  expiresAt?: Date
  error?: Error
}

export type SessionChangeCallback = (state: SessionState) => void

export interface AutoRefreshConfig {
  enabled: boolean
  refreshBuffer: number // minutes
  maxRetries: number
  retryDelay: number // ms
}

// API response types
export interface ApiResponse<T> {
  data?: T
  error?: ApiError
}

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: Record<string, any>
}

export interface ErrorResponse {
  error: string
}

// HTTP request options
export interface RequestOptions {
  headers?: Record<string, string>
  credentials?: RequestCredentials
}
