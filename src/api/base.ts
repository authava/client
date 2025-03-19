import type { AuthavaConfig, ErrorResponse, RequestOptions } from '../types/index'

/**
 * Base API client for making requests to the Authava API
 */
export class BaseApiClient {
  private config: Required<AuthavaConfig>

  constructor(config: Required<AuthavaConfig>) {
    this.config = config
  }

  /**
   * Make a request to the Authava API
   */
  protected async request<T>(
    endpoint: string,
    method: string,
    data?: any,
    options: RequestOptions = {},
  ): Promise<T | ErrorResponse> {
    const protocol = this.config.secure ? 'https' : 'http'
    const url = `${protocol}://${this.config.resolverDomain}${endpoint}`

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      host: this.config.domain,
    }

    const configCustomHeaders =
      typeof this.config.customHeaders === 'function'
        ? this.config.customHeaders()
        : this.config.customHeaders

    const headers = { ...defaultHeaders, ...configCustomHeaders, ...options.headers }

    // Check if session cookie is missing and a token is available in storage or URL.

    const hasSessionCookie = typeof document !== 'undefined' && document.cookie.includes('session=')
    const tokenFromStorage =
      typeof localStorage !== 'undefined' ? localStorage.getItem('session_token') : null

    // Fall back to Authorization header if no cookie is present.

    if (!hasSessionCookie && tokenFromStorage && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${tokenFromStorage}`
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: options.credentials || 'include',
    }

    // Add body for non-GET requests
    if (method !== 'GET' && data !== undefined) {
      requestOptions.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, requestOptions)

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type')
      const isJson = contentType && contentType.includes('application/json')

      // For successful empty responses
      if (
        response.status === 204 ||
        (response.status === 200 && response.headers.get('content-length') === '0')
      ) {
        return {} as T
      }

      // Parse response
      const responseData = isJson ? await response.json() : await response.text()

      // Handle error responses
      if (!response.ok) {
        const errorResponse: ErrorResponse = responseData

        this.logError(`API error (${response.status})`, errorResponse.error)
        return errorResponse
      }

      // For successful responses, directly return the data
      return responseData as T
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      this.logError('API request failed', error)

      return { error: errorMessage }
    }
  }

  /**
   * Log an error if debug mode is enabled
   */
  protected logError(message: string, error: unknown): void {
    if (this.config.debug) {
      console.error(`[AuthavaClient] ${message}:`, error)
    }
  }

  /**
   * Log a message if debug mode is enabled
   */
  protected log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[AuthavaClient]', ...args)
    }
  }
}
