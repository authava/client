import type {
  AuthavaAdminConfig,
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminCreateTokenRequest,
  AdminCreateTokenResponse,
  ErrorResponse,
} from '../types/index'

/**
 * Admin API client for backend-only operations.
 * Uses API key authentication instead of cookies/sessions.
 * No browser dependencies — safe for Node.js/Deno/Bun server-side use.
 */
export class AdminApiClient {
  private config: Required<AuthavaAdminConfig>

  constructor(config: AuthavaAdminConfig) {
    this.config = {
      secure: true,
      debug: false,
      ...config,
    } as Required<AuthavaAdminConfig>
  }

  private async request<T>(
    endpoint: string,
    method: string,
    data?: unknown,
  ): Promise<T | ErrorResponse> {
    const protocol = this.config.secure ? 'https' : 'http'
    const url = `${protocol}://${this.config.resolverDomain}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      host: this.config.domain,
      'api-key': this.config.apiKey,
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    }

    if (method !== 'GET' && data !== undefined) {
      requestOptions.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, requestOptions)

      const contentType = response.headers.get('content-type')
      const isJson = contentType && contentType.includes('application/json')

      if (
        response.status === 204 ||
        (response.status === 200 && response.headers.get('content-length') === '0')
      ) {
        return {} as T
      }

      const responseData = isJson ? await response.json() : await response.text()

      if (!response.ok) {
        const errorResponse: ErrorResponse = responseData
        this.logError(`API error (${response.status})`, errorResponse.error)
        return errorResponse
      }

      return responseData as T
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      this.logError('API request failed', error)
      return { error: errorMessage }
    }
  }

  /**
   * Create a user without a password.
   * Optionally sends a "set your password" email and/or skips email verification.
   */
  async createUser(
    data: AdminCreateUserRequest,
  ): Promise<AdminCreateUserResponse | ErrorResponse> {
    return this.request<AdminCreateUserResponse>('/internal/users', 'POST', data)
  }

  /**
   * Generate a session token for a user without requiring a password.
   * Enables magic link flows where your application authenticates the user.
   */
  async createToken(
    data: AdminCreateTokenRequest,
  ): Promise<AdminCreateTokenResponse | ErrorResponse> {
    return this.request<AdminCreateTokenResponse>('/internal/users/token', 'POST', data)
  }

  private logError(message: string, error: unknown): void {
    if (this.config.debug) {
      console.error(`[AuthavaAdminClient] ${message}:`, error)
    }
  }
}
