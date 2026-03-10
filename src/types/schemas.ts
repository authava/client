/**
 * Generated types from the Authava API specification
 */

// Common types
export type Uuid = string

export type OffsetDateTime = string

// User types
export interface MinimalUser {
  id: Uuid
  email: string
  roles: string[]
  permissions: string[]
  teams: TeamContext[]
  last_login_at?: OffsetDateTime
}

export interface TeamContext {
  id: string
  name: string
  is_owner: boolean
  scopes: Scope[]
}

export interface Scope {
  resource_type: string
  resource_id: string
  action: string
}

export interface User extends MinimalUser {
  status: string
  email_verified: boolean
  created_at: OffsetDateTime
  updated_at: OffsetDateTime
  password_hash?: string
}

export interface ScopeInput {
  resource_type: string
  resource_id: string
  actions: string[]
  resolver?: (resource_type: string, team: TeamContext) => Promise<string[]>
}

// Authentication types
export interface LoginRequest {
  email: string
  password: string
  next?: string | null
}

export interface LoginResponse {
  user: MinimalUser
  redirect_url: string
  authority: string
  tenant_id: string
}

export interface ErrorResponse {
  error: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

// MFA types
export interface MFAMethodInfo {
  id: Uuid
  mfa_type: string
  verified: boolean
  created_at: OffsetDateTime
  last_used_at?: OffsetDateTime
  name?: string
}

export interface MFARequiredResponse {
  user_id: Uuid
  session_id: Uuid
  mfa_methods: MFAMethodInfo[]
}

export interface MFAVerifyRequest {
  session_id: Uuid
  method_id: Uuid
  code: string
}

export interface SendMFAEmailRequest {
  session_id: Uuid
  method_id: Uuid
}

export interface SetupEmailMFARequest {
  name?: string
}

export interface VerifyEmailMFARequest {
  code: string
}

export interface SetupTOTPRequest {
  name?: string
}

export interface SetupTOTPResponse {
  secret: string
  qr_code: string
  method_id: Uuid
}

export interface VerifyTOTPRequest {
  method_id: Uuid
  code: string
}

export interface BackupCodesResponse {
  codes: string[]
}

// Profile types
export interface ProfileResponse {
  user: User
  mfa_methods: MFAMethodInfo[]
  notification_preferences: UserNotificationPreferences
  recent_security_events: UserSecurityEvent[]
}

// Admin API types (backend-only, API-key-protected)
export interface AdminCreateUserRequest {
  email: string
  username?: string
  password?: string
  password_confirm?: string
  roles?: string[]
  skip_email_verification?: boolean
  send_set_password_email?: boolean
}

export interface AdminCreateUserResponse {
  user_id: Uuid
  email: string
  username?: string
  email_verified: boolean
  set_password_token?: string
}

export interface AdminCreateTokenRequest {
  email?: string
  user_id?: Uuid
}

export interface AdminCreateTokenResponse {
  session_token: string
  user: MinimalUser
}

export interface ChangeEmailRequest {
  new_email: string
  password: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface UserNotificationPreferences {
  user_id: Uuid
  security_alerts: boolean
  account_activity: boolean
  product_updates: boolean
  marketing_emails: boolean
  created_at: OffsetDateTime
  updated_at: OffsetDateTime
}

export interface UpdateNotificationPreferencesRequest {
  security_alerts: boolean
  account_activity: boolean
  product_updates: boolean
  marketing_emails: boolean
}

export interface UserSecurityEvent {
  id: Uuid
  user_id: Uuid
  event_type: string
  created_at: OffsetDateTime
  ip_address?: string
  user_agent?: string
  details?: any
}
