import type {
  AuthavaConfig,
  AuthavaSession,
  SessionState,
  SessionChangeCallback,
  AutoRefreshConfig,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MFAVerifyRequest,
  SendMFAEmailRequest,
  ProfileResponse,
  ChangeEmailRequest,
  ChangePasswordRequest,
  UpdateNotificationPreferencesRequest,
  UserNotificationPreferences,
  SetupEmailMFARequest,
  VerifyEmailMFARequest,
  SetupTOTPRequest,
  SetupTOTPResponse,
  VerifyTOTPRequest,
  BackupCodesResponse,
  Uuid,
  ErrorResponse,
  AuthavaResult,
  Scope,
  TeamContext,
  ScopeInput,
} from './types/index'

import { AuthApi, ProfileApi, MfaApi } from './api'

export function toAuthavaResult<T = void>(response: ErrorResponse | T): AuthavaResult<T> {
  return response && typeof response === 'object' && 'error' in response
    ? { success: false, error: response.error.toString() }
    : { success: true, data: response as T }
}

export class AuthavaClient {
  private config: Required<AuthavaConfig>
  private refreshTimer?: ReturnType<typeof setTimeout>
  private refreshing = false
  private currentState: SessionState
  private subscribers = new Set<SessionChangeCallback>()
  private broadcastChannel?: BroadcastChannel
  private autoRefreshConfig: AutoRefreshConfig

  // API clients
  private authApi: AuthApi
  private profileApi: ProfileApi
  private mfaApi: MfaApi

  constructor(config: AuthavaConfig) {
    const resolverDomain = config.resolverDomain || config.domain

    this.config = {
      domain: config.domain,
      resolverDomain,
      secure: config.secure ?? true,
      autoRefresh: config.autoRefresh ?? true,
      refreshBuffer: config.refreshBuffer ?? 5,
      customHeaders: config.customHeaders ?? {},
      debug: config.debug ?? false,
    }

    this.autoRefreshConfig = {
      enabled: this.config.autoRefresh,
      refreshBuffer: this.config.refreshBuffer,
      maxRetries: 3,
      retryDelay: 1000,
    }

    this.currentState = {
      status: 'expired',
      user: null,
    }

    // Initialize API clients
    this.authApi = new AuthApi(this.config)
    this.profileApi = new ProfileApi(this.config)
    this.mfaApi = new MfaApi(this.config)

    // Initialize cross-tab communication if BroadcastChannel is available
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('authava-session')
      this.broadcastChannel.onmessage = (event) => {
        this.handleSessionBroadcast(event.data)
      }
    }

    this.log('Initialized with config:', this.config)

    // Perform initial session check if fetch is available
    this.checkSession()
  }

  hasRoles(roles: string[] | string): boolean {
    if (!this.currentState.user || !Array.isArray(this.currentState.user.roles)) return false
    const required = Array.isArray(roles) ? roles : [roles]
    return required.every((r) => this.currentState.user!.roles.includes(r))
  }

  hasPermissions(permissions: string[] | string): boolean {
    if (!this.currentState.user || !Array.isArray(this.currentState.user.permissions)) return false
    const required = Array.isArray(permissions) ? permissions : [permissions]
    return required.every((p) => this.currentState.user!.permissions.includes(p))
  }

  async hasScopes({ resource_type, resource_id, actions, resolver }: ScopeInput): Promise<boolean> {
    const user = this.currentState.user
    if (!user || !Array.isArray(user.teams)) return false

    for (const team of user.teams as TeamContext[]) {
      if (!Array.isArray(team.scopes)) continue

      const results = await Promise.all(
        actions.map((action) =>
          this.teamHasMatchingScope(
            team.scopes,
            resource_type,
            resource_id,
            [action],
            team,
            resolver,
          ),
        ),
      )

      if (results.every(Boolean)) {
        return true
      }
    }

    return false
  }

  private async teamHasMatchingScope(
    scopes: Scope[],
    resource_type: string,
    resource_id: string,
    actions: string[],
    team: TeamContext,
    resolver?: (resource_type: string, team: TeamContext) => Promise<string[]>,
  ): Promise<boolean> {
    for (const scope of scopes) {
      if (scope.resource_type !== resource_type) continue
      if (!actions.includes(scope.action)) continue
      if (scope.resource_id === resource_id) return true
      if (scope.resource_id !== '*') continue
      if (!resolver) continue

      try {
        const allowed = await resolver(resource_type, team)
        if (allowed.includes(resource_id)) return true
      } catch {
        continue
      }
    }

    return false
  }

  private encodeBase64Url(input: string): string {
    return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  private setLogoutReason(reason: string) {
    if (typeof document === 'undefined') return
    document.cookie = `logout_reason=${encodeURIComponent(reason)}; path=/; SameSite=None; Secure`
  }

  // Private method for logging
  private log(...args: unknown[]) {
    if (this.config.debug) {
      console.log('[AuthavaClient]', ...args)
    }
  }

  /**
   * Log the user out.
   * Clears the session cookie, updates the state, and redirects the user.
   */
  async logout(reason?: string) {
    this.log('Logging out user.')

    await this.authApi.logout()

    if (typeof document !== 'undefined') {
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    }

    this.updateState({ status: 'expired', user: null })

    if (typeof window === 'undefined') {
      this.log('Skipping redirect, window is not defined (SSR or backend).')
      return
    }

    const defaultRedirect = `${this.config.secure ? 'https' : 'http'}://${this.config.domain}`
    const redirectUrl = localStorage.getItem('redirect_after_logout') || defaultRedirect
    localStorage.removeItem('redirect_after_logout')

    const reasonParam = reason ? `reason=${encodeURIComponent(reason)}` : ''
    const currentUrl = window?.location?.href || ''
    const nextParam = currentUrl ? `next=${this.encodeBase64Url(currentUrl)}` : ''
    const queryParams = [reasonParam, nextParam].filter(Boolean).join('&')
    const finalRedirect = queryParams ? `${redirectUrl}?${queryParams}` : redirectUrl

    window.location.href = finalRedirect
  }

  private getLogoutReason(): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(/(?:^|; )logout_reason=([^;]*)/)
    return match ? decodeURIComponent(match[1]) : null
  }

  /**
   * Get the current session if it exists.
   * If a session error occurs (including CORS errors), logs out the user.
   */
  private fetchFailureCount = 0

  private getTokenFromStorage(): string | null {
    if (typeof localStorage === 'undefined') return null

    const stored = localStorage.getItem('session_token')
    if (stored) return stored

    if (typeof window !== 'undefined' && window.location?.href) {
      try {
        const url = new URL(window.location.href)
        const urlToken = url.searchParams.get('token')

        if (urlToken) {
          localStorage.setItem('session_token', urlToken)
          return urlToken
        }
      } catch (e) {}
    }

    return null
  }

  async getSession(extraHeaders?: Record<string, string>): Promise<AuthavaSession | null> {
    try {
      const protocol = this.config.secure ? 'https' : 'http'

      const defaultHeaders: Record<string, string> = {
        Accept: 'application/json',
        host: this.config.domain,
      }

      const tokenFromCookie = this.getTokenFromCookie()
      const tokenFromStorage = this.getTokenFromStorage()

      if (!tokenFromCookie && tokenFromStorage) {
        defaultHeaders.Authorization = `Bearer ${tokenFromStorage}`
      }

      const configCustom =
        (typeof this.config.customHeaders === 'function'
          ? this.config.customHeaders()
          : this.config.customHeaders) || {}

      const headers = { ...defaultHeaders, ...configCustom, ...extraHeaders }

      const url = `${protocol}://${this.config.resolverDomain}/session`

      this.log('getSession request to:', url, 'with headers:', headers)

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers,
      })

      if (!response.ok) {
        if (response.status === 401) {
          this.log('Session expired or unauthorized')
          this.setLogoutReason('unauthorized')
          await this.logout('unauthorized')
          return null
        }
        throw new Error(`Session check failed: ${response.statusText}`)
      }

      const session = await response.json()

      if (!session || !session.user || !session.user.id || !session.user.email) {
        throw new Error('Invalid session data received')
      }

      this.fetchFailureCount = 0

      this.updateState({ status: 'valid', user: session.user })

      this.log('Session retrieved successfully:', session)

      return session
    } catch (error) {
      this.log('getSession error:', error)

      const isNetworkError = error instanceof TypeError && error.message.includes('Failed to fetch')

      if (isNetworkError) {
        this.fetchFailureCount++
        this.log(`❌ Network error #${this.fetchFailureCount}:`, error)

        if (this.fetchFailureCount >= 3) {
          this.log('🚨 Logging out due to repeated fetch failures.')
          this.setLogoutReason('cors')
          await this.logout('cors')
        } else {
          this.updateState({ status: 'error', error })
        }
      } else {
        this.updateState({ status: 'error', error: error as Error })
      }

      return null
    }
  }

  /**
   * Subscribe to session changes.
   * Returns an unsubscribe function.
   */
  onSessionChange(callback: SessionChangeCallback): () => void {
    this.subscribers.add(callback)

    // Immediately notify of current state
    callback(this.currentState)

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private async checkSession() {
    const session = await this.getSession()
    if (session && this.autoRefreshConfig.enabled) {
      // Calculate token expiration from JWT
      const token = this.getTokenFromCookie()
      if (token) {
        const expiresAt = this.getTokenExpiration(token)
        if (expiresAt) {
          this.startAutoRefresh(expiresAt)
        }
      }
    }
  }

  private getTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null

    const cookieMatch = document.cookie.match(/(?:^|; )session=([^;]*)/)
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
  }

  private getTokenExpiration(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return new Date(payload.exp * 1000)
    } catch {
      return null
    }
  }

  private async startAutoRefresh(expiresAt: Date) {
    if (!this.autoRefreshConfig.enabled) return

    const buffer = this.autoRefreshConfig.refreshBuffer * 60 * 1000 // Convert to ms
    const refreshTime = new Date(expiresAt.getTime() - buffer)

    // Clear any existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    // Set new timer
    const delay = Math.max(0, refreshTime.getTime() - Date.now())
    this.refreshTimer = setTimeout(() => this.refreshSession(), delay)
  }

  private async refreshSession(retryCount = 0): Promise<void> {
    if (this.refreshing) return

    try {
      this.refreshing = true
      this.updateState({ status: 'refreshing' })

      const session = await this.getSession()

      if (!session) {
        await this.logout()
        return
      }

      const token = this.getTokenFromCookie()
      if (!token) {
        return
      }

      const expiresAt = this.getTokenExpiration(token)
      if (expiresAt) {
        this.updateState({
          status: 'valid',
          user: session.user,
          expiresAt,
        })

        // Schedule next refresh
        this.startAutoRefresh(expiresAt)
      }
    } catch (error) {
      if (retryCount < this.autoRefreshConfig.maxRetries) {
        // Exponential backoff
        const delay = this.autoRefreshConfig.retryDelay * Math.pow(2, retryCount)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.refreshSession(retryCount + 1)
      }

      this.updateState({
        status: 'error',
        error: error as Error,
      })
    } finally {
      this.refreshing = false
    }
  }

  private updateState(newState: Partial<SessionState>) {
    this.currentState = { ...this.currentState, ...newState }

    // Notify subscribers
    this.notifySubscribers()

    // Broadcast to other tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(this.currentState)
    }
  }

  private notifySubscribers() {
    for (const callback of this.subscribers) {
      try {
        callback(this.currentState)
      } catch (error) {
        console.error('Error in session change callback:', error)
      }
    }
  }

  private handleSessionBroadcast(state: SessionState) {
    // Update local state if it's different
    if (JSON.stringify(state) !== JSON.stringify(this.currentState)) {
      this.currentState = state
      this.notifySubscribers()
    }
  }

  // ===== Authentication Methods =====

  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<AuthavaResult<LoginResponse>> {
    const response = await this.authApi.login(data)

    if (!response.success) {
      return response
    }

    this.updateState({
      status: 'valid',
      user: response.data.user,
    })

    const token = this.getTokenFromCookie()
    if (token && this.autoRefreshConfig.enabled) {
      const expiresAt = this.getTokenExpiration(token)
      if (expiresAt) {
        this.startAutoRefresh(expiresAt)
      }
    }

    return response
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthavaResult<void>> {
    return this.authApi.register(data)
  }

  /**
   * Request a password reset
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthavaResult<void>> {
    return this.authApi.forgotPassword(data)
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<AuthavaResult<void>> {
    return this.authApi.resetPassword(data)
  }

  /**
   * Verify MFA code
   */
  async verifyMfa(data: MFAVerifyRequest): Promise<AuthavaResult<LoginResponse>> {
    const response = await this.authApi.verifyMfa(data)

    if (response.success) {
      this.updateState({
        status: 'valid',
        user: response.data.user,
      })
    }

    return response
  }

  /**
   * Send MFA verification email
   */
  async sendMfaEmail(data: SendMFAEmailRequest): Promise<AuthavaResult<void>> {
    return this.authApi.sendMfaEmail(data)
  }

  // ===== Profile Methods =====

  /**
   * Get user profile information
   */
  async getProfile(): Promise<AuthavaResult<ProfileResponse>> {
    const res = await this.profileApi.getProfile()
    return toAuthavaResult(res)
  }
  /**
   * Change email address
   */
  async changeEmail(data: ChangeEmailRequest): Promise<AuthavaResult<void>> {
    const res = await this.profileApi.changeEmail(data)
    return toAuthavaResult(res)
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequest): Promise<AuthavaResult<void>> {
    const res = await this.profileApi.changePassword(data)
    return toAuthavaResult(res)
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    data: UpdateNotificationPreferencesRequest,
  ): Promise<AuthavaResult<UserNotificationPreferences>> {
    const res = await this.profileApi.updateNotificationPreferences(data)
    return toAuthavaResult(res)
  }

  /**
   * Remove an MFA method
   */
  async removeMfaMethod(methodId: Uuid): Promise<AuthavaResult<void>> {
    const res = await this.profileApi.removeMfaMethod(methodId)
    return toAuthavaResult(res)
  }

  // ===== MFA Methods =====

  /**
   * Initialize Email MFA setup
   */
  async setupEmailMfa(data: SetupEmailMFARequest): Promise<AuthavaResult<void>> {
    return this.mfaApi.setupEmailMfa(data)
  }

  /**
   * Verify and activate Email MFA
   */
  async verifyEmailMfa(data: VerifyEmailMFARequest): Promise<AuthavaResult<BackupCodesResponse>> {
    return this.mfaApi.verifyEmailMfa(data)
  }

  /**
   * Initialize TOTP MFA setup
   */
  async setupTotp(data: SetupTOTPRequest): Promise<AuthavaResult<SetupTOTPResponse>> {
    return this.mfaApi.setupTotp(data)
  }

  /**
   * Verify and activate TOTP MFA
   */
  async verifyTotp(data: VerifyTOTPRequest): Promise<AuthavaResult<BackupCodesResponse>> {
    return this.mfaApi.verifyTotp(data)
  }
}
