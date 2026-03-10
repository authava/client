import type {
  AuthavaAdminConfig,
  AuthavaResult,
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminCreateTokenRequest,
  AdminCreateTokenResponse,
  ErrorResponse,
} from './types/index'

import { AdminApiClient } from './api/admin'

function toAdminResult<T>(response: ErrorResponse | T): AuthavaResult<T> {
  return response && typeof response === 'object' && 'error' in response
    ? { success: false, error: (response as ErrorResponse).error.toString() }
    : { success: true, data: response as T }
}

/**
 * Authava Admin Client — backend-only operations using API key authentication.
 *
 * This client is designed for server-side use only (Node.js, Deno, Bun).
 * It has NO browser dependencies (no document, localStorage, window, etc.).
 *
 * Use this for:
 * - Creating users without passwords (e.g., admin provisioning)
 * - Generating session tokens without passwords (e.g., magic links)
 *
 * @example
 * ```typescript
 * import { AuthavaAdminClient } from '@authava/client'
 *
 * const admin = new AuthavaAdminClient({
 *   resolverDomain: 'auth.example.com',
 *   domain: 'app.example.com',
 *   apiKey: 'ak_clientid_secret',
 * })
 *
 * // Create a user and email them a "set your password" link
 * const result = await admin.createUser({
 *   email: 'user@example.com',
 *   send_set_password_email: true,
 *   skip_email_verification: true,
 * })
 *
 * // Generate a magic link token for passwordless login
 * const tokenResult = await admin.createToken({
 *   email: 'user@example.com',
 * })
 * if (tokenResult.success) {
 *   // Use tokenResult.data.session_token to set the session cookie
 * }
 * ```
 */
export class AuthavaAdminClient {
  private api: AdminApiClient

  constructor(config: AuthavaAdminConfig) {
    this.api = new AdminApiClient(config)
  }

  /**
   * Create a user without a password.
   *
   * @param data.email - User's email address (required)
   * @param data.username - Optional username
   * @param data.roles - Optional role names to assign
   * @param data.skip_email_verification - If true, marks email as verified immediately
   * @param data.send_set_password_email - If true, sends a "set your password" email
   */
  async createUser(data: AdminCreateUserRequest): Promise<AuthavaResult<AdminCreateUserResponse>> {
    const res = await this.api.createUser(data)
    return toAdminResult(res)
  }

  /**
   * Generate a session token for a user without requiring a password.
   * This enables magic link flows where your application authenticates the user
   * through its own mechanism, then obtains an Authava session token.
   *
   * @param data.email - User's email address (provide either email or user_id)
   * @param data.user_id - User's UUID (provide either email or user_id)
   */
  async createToken(
    data: AdminCreateTokenRequest,
  ): Promise<AuthavaResult<AdminCreateTokenResponse>> {
    const res = await this.api.createToken(data)
    return toAdminResult(res)
  }
}
