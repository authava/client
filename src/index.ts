export { AuthavaClient } from './client'
export { MockAuthavaClient } from './mock'

// Export all types
export type {
  // Client configuration types
  AuthavaConfig,
  AuthavaSession,
  AuthavaUser,
  SessionState,
  SessionStatus,
  SessionChangeCallback,

  // Teams
  TeamContext,
  Scope,

  // Common types
  Uuid,
  OffsetDateTime,

  // User types
  User,
  MinimalUser,

  // Authentication types
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,

  // MFA types
  MFAMethodInfo,
  MFARequiredResponse,
  MFAVerifyRequest,
  SendMFAEmailRequest,
  SetupEmailMFARequest,
  VerifyEmailMFARequest,
  SetupTOTPRequest,
  SetupTOTPResponse,
  VerifyTOTPRequest,
  BackupCodesResponse,

  // Profile types
  ProfileResponse,
  ChangeEmailRequest,
  ChangePasswordRequest,
  UpdateNotificationPreferencesRequest,
  UserNotificationPreferences,
  UserSecurityEvent,

  // API Error Respons
  ErrorResponse,

  // Authava API Result
  AuthavaResult,
} from './types/index'
