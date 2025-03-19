import { BaseApiClient } from './base'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MFAVerifyRequest,
  SendMFAEmailRequest,
  AuthavaResult,
} from '../types/index'
import { toAuthavaResult } from '../client'

/**
 * Authentication API client
 */
export class AuthApi extends BaseApiClient {
  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<AuthavaResult<LoginResponse>> {
    const res = await this.request<LoginResponse>('/login', 'POST', data)
    return toAuthavaResult(res)
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthavaResult<void>> {
    const res = await this.request<void>('/register', 'POST', data)
    return toAuthavaResult(res)
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<AuthavaResult<LoginResponse>> {
    const res = await this.request<LoginResponse>('/session', 'GET')
    return toAuthavaResult(res)
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<AuthavaResult<void>> {
    const res = await this.request<void>('/logout', 'POST')
    return toAuthavaResult(res)
  }

  /**
   * Request a password reset
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthavaResult<void>> {
    const res = await this.request<void>('/forgot-password', 'POST', data)
    return toAuthavaResult(res)
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<AuthavaResult<void>> {
    const res = await this.request<void>('/reset-password', 'POST', data)
    return toAuthavaResult(res)
  }

  /**
   * Verify MFA code
   */
  async verifyMfa(data: MFAVerifyRequest): Promise<AuthavaResult<LoginResponse>> {
    const res = await this.request<LoginResponse>('/verify-mfa', 'POST', data)
    return toAuthavaResult(res)
  }

  /**
   * Send MFA verification email
   */
  async sendMfaEmail(data: SendMFAEmailRequest): Promise<AuthavaResult<void>> {
    const res = await this.request<void>('/send-mfa-email', 'POST', data)
    return toAuthavaResult(res)
  }
}
