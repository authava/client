export interface AuthavaUser {
  id: string
  email: string
  [key: string]: any
}

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

export interface AuthavaConfig {
  domain: string
  resolverDomain?: string
  secure?: boolean
  autoRefresh?: boolean
  refreshBuffer?: number
  customHeaders?: Record<string, string> | (() => Record<string, string>)
  debug?: boolean
}

export type SessionChangeCallback = (state: SessionState) => void

export interface AutoRefreshConfig {
  enabled: boolean
  refreshBuffer: number // minutes
  maxRetries: number
  retryDelay: number // ms
}
