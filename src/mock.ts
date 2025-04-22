import type {
  AuthavaSession,
  AuthavaConfig,
  SessionChangeCallback,
  SessionState,
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
  User,
  MFAMethodInfo,
  AuthavaResult,
} from './types/index.ts'

export class MockAuthavaClient {
  private currentState: SessionState
  private subscribers = new Set<SessionChangeCallback>()
  private config: Partial<AuthavaConfig>
  private mockMfaMethods: MFAMethodInfo[] = []
  private mockUser: User | null = null

  constructor(config?: Partial<AuthavaConfig>) {
    this.currentState = {
      status: 'expired',
      user: null,
    }
    this.config = config || {}

    if (config?.debug) {
      console.log('[MockAuthavaClient] Initialized')
    }
  }

  // Helper method to create a successful API response
  private createSuccessResponse<T>(data: T): AuthavaResult<T> {
    return { data, success: true }
  }

  // Helper method for void responses
  private createVoidSuccessResponse(): AuthavaResult<void> {
    return { success: true, data: undefined }
  }

  // Helper method to create an error API response
  private createErrorResponse<T>(message: string, code = '400', status = 400): AuthavaResult<T> {
    return { success: false, error: message, code }
  }

  // Helper method to log debug messages
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[MockAuthavaClient]', ...args)
    }
  }

  // ===== Session Management =====

  async getSession(): Promise<AuthavaSession | null> {
    return this.currentState.status === 'valid'
      ? {
          user: this.currentState.user!,
          redirect_url: 'https://dashboard.example.com',
          authority: 'auth.example.com',
          tenant_id: 'mock-tenant-id',
        }
      : null
  }

  setSession(session: AuthavaSession) {
    this.currentState = {
      status: 'valid',
      user: session.user,
    }
    this.notifySubscribers()
  }

  expireSession() {
    this.currentState = {
      status: 'expired',
      user: null,
    }
    this.notifySubscribers()
  }

  onSessionChange(callback: SessionChangeCallback): () => void {
    this.subscribers.add(callback)
    callback(this.currentState)

    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notifySubscribers() {
    for (const callback of this.subscribers) {
      try {
        callback(this.currentState)
      } catch (error) {
        console.error('MockAuthavaClient callback error:', error)
      }
    }
  }

  async logout(): Promise<AuthavaResult<void>> {
    this.expireSession()

    // Get domain from config or fallback to example.com
    const domain = this.config.domain || 'example.com'
    const secure = this.config.secure !== false // default true
    const defaultRedirect = `${secure ? 'https' : 'http'}://${domain}`
    const redirectUrl = defaultRedirect

    // Only attempt redirect if window exists (browser environment)
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl
    } else if (this.config.debug) {
      this.log(`Would redirect to: ${redirectUrl}`)
    }

    return this.createVoidSuccessResponse()
  }

  // ===== Authentication Methods =====

  async login(data: LoginRequest): Promise<AuthavaResult<LoginResponse>> {
    this.log('Mock login with:', data)

    // Simulate validation
    if (!data.email || !data.password) {
      return this.createErrorResponse<LoginResponse>('Email and password are required')
    }

    // Simulate successful login
    const user = {
      id: 'mock-user-id',
      email: data.email,
      roles: [],
      permissions: [],
      teams: [],
      last_login_at: new Date().toISOString(),
    }

    const response: LoginResponse = {
      user,
      redirect_url: 'https://dashboard.example.com',
      authority: 'auth.example.com',
      tenant_id: 'mock-tenant-id',
    }

    this.setSession({
      user,
      redirect_url: response.redirect_url,
      authority: 'auth.example.com',
      tenant_id: 'mock-tenant-id',
    })
    return this.createSuccessResponse<LoginResponse>(response)
  }

  async register(data: RegisterRequest): Promise<AuthavaResult<void>> {
    this.log('Mock register with:', data)

    // Simulate validation
    if (!data.email || !data.password) {
      return this.createErrorResponse('Email and password are required')
    }

    // Simulate successful registration
    return this.createVoidSuccessResponse()
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthavaResult<void>> {
    this.log('Mock forgot password with:', data)

    // Simulate validation
    if (!data.email) {
      return this.createErrorResponse('Email is required')
    }

    // Simulate successful password reset request
    return this.createVoidSuccessResponse()
  }

  async resetPassword(data: ResetPasswordRequest): Promise<AuthavaResult<void>> {
    this.log('Mock reset password with:', data)

    // Simulate validation
    if (!data.token || !data.password) {
      return this.createErrorResponse('Token and password are required')
    }

    // Simulate successful password reset
    return this.createVoidSuccessResponse()
  }

  async verifyMfa(data: MFAVerifyRequest): Promise<AuthavaResult<LoginResponse>> {
    this.log('Mock verify MFA with:', data)

    // Simulate validation
    if (!data.session_id || !data.method_id || !data.code) {
      return this.createErrorResponse('Session ID, method ID, and code are required')
    }

    // Simulate successful MFA verification
    const user = {
      id: 'mock-user-id',
      email: 'mock@example.com',
      roles: [],
      permissions: [],
      teams: [],
      last_login_at: new Date().toISOString(),
    }

    const response: LoginResponse = {
      user,
      redirect_url: 'https://dashboard.example.com',
      authority: 'auth.example.com',
      tenant_id: 'mock-tenant-id',
    }

    this.setSession({
      user,
      redirect_url: response.redirect_url,
      authority: 'auth.example.com',
      tenant_id: 'mock-tenant-id',
    })
    return this.createSuccessResponse<LoginResponse>(response)
  }

  async sendMfaEmail(data: SendMFAEmailRequest): Promise<AuthavaResult<void>> {
    this.log('Mock send MFA email with:', data)

    // Simulate validation
    if (!data.session_id || !data.method_id) {
      return this.createErrorResponse('Session ID and method ID are required')
    }

    // Simulate successful MFA email sending
    return this.createVoidSuccessResponse()
  }

  // ===== Profile Methods =====

  async getProfile(): Promise<AuthavaResult<ProfileResponse>> {
    this.log('Mock get profile')

    // Check if user is logged in
    if (this.currentState.status !== 'valid' || !this.currentState.user) {
      return this.createErrorResponse('Not authenticated', '401', 401)
    }

    // Create mock user if not exists
    if (!this.mockUser) {
      this.mockUser = {
        id: this.currentState.user.id,
        email: this.currentState.user.email,
        status: 'active',
        email_verified: true,
        roles: [],
        permissions: [],
        teams: [],
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        updated_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      }
    }

    // Create mock profile response
    const response: ProfileResponse = {
      user: this.mockUser,
      mfa_methods: this.mockMfaMethods,
      notification_preferences: {
        user_id: this.mockUser.id,
        security_alerts: true,
        account_activity: true,
        product_updates: false,
        marketing_emails: false,
        created_at: this.mockUser.created_at,
        updated_at: this.mockUser.updated_at,
      },
      recent_security_events: [
        {
          id: 'mock-event-1',
          user_id: this.mockUser.id,
          event_type: 'login',
          created_at: new Date().toISOString(),
          ip_address: '127.0.0.1',
          user_agent: 'Mock Browser',
        },
      ],
    }

    return this.createSuccessResponse<ProfileResponse>(response)
  }

  async changeEmail(data: ChangeEmailRequest): Promise<AuthavaResult<void>> {
    this.log('Mock change email with:', data)

    // Simulate validation
    if (!data.new_email || !data.password) {
      return this.createErrorResponse('New email and password are required')
    }

    // Check if user is logged in
    if (this.currentState.status !== 'valid' || !this.currentState.user) {
      return this.createErrorResponse('Not authenticated', '401', 401)
    }

    // Update mock user email
    if (this.mockUser) {
      this.mockUser.email = data.new_email
      this.mockUser.updated_at = new Date().toISOString()
    }

    // Update session user
    const updatedUser = { ...this.currentState.user, email: data.new_email }
    this.setSession({
      user: updatedUser,
      redirect_url: 'https://dashboard.example.com',
      authority: 'auth.example.com',
      tenant_id: 'mock-tenant-id',
    })

    return this.createVoidSuccessResponse()
  }

  async changePassword(data: ChangePasswordRequest): Promise<AuthavaResult<void>> {
    this.log('Mock change password with:', data)

    // Simulate validation
    if (!data.current_password || !data.new_password) {
      return this.createErrorResponse('Current password and new password are required')
    }

    // Check if user is logged in
    if (this.currentState.status !== 'valid' || !this.currentState.user) {
      return this.createErrorResponse('Not authenticated', '401', 401)
    }

    // Simulate successful password change
    if (this.mockUser) {
      this.mockUser.updated_at = new Date().toISOString()
    }

    return this.createVoidSuccessResponse()
  }

  async updateNotificationPreferences(
    data: UpdateNotificationPreferencesRequest,
  ): Promise<AuthavaResult<UserNotificationPreferences>> {
    this.log('Mock update notification preferences with:', data)

    // Check if user is logged in
    if (this.currentState.status !== 'valid' || !this.currentState.user) {
      return this.createErrorResponse('Not authenticated', '401', 401)
    }

    // Create mock response
    const response: UserNotificationPreferences = {
      user_id: this.currentState.user.id,
      security_alerts: data.security_alerts,
      account_activity: data.account_activity,
      product_updates: data.product_updates,
      marketing_emails: data.marketing_emails,
      created_at:
        this.mockUser?.created_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    return this.createSuccessResponse<UserNotificationPreferences>(response)
  }

  async removeMfaMethod(methodId: Uuid): Promise<AuthavaResult<void>> {
    this.log('Mock remove MFA method:', methodId)

    // Check if user is logged in
    if (this.currentState.status !== 'valid' || !this.currentState.user) {
      return this.createErrorResponse('Not authenticated', '401', 401)
    }

    // Remove method from mock MFA methods
    this.mockMfaMethods = this.mockMfaMethods.filter((method) => method.id !== methodId)

    return this.createVoidSuccessResponse()
  }

  // ===== MFA Methods =====

  async setupEmailMfa(data: SetupEmailMFARequest): Promise<AuthavaResult<void>> {
    this.log('Mock setup email MFA with:', data)

    // Check if user is logged in
    if (this.currentState.status !== 'valid' || !this.currentState.user) {
      return this.createErrorResponse('Not authenticated', '401', 401)
    }

    // Create mock MFA method
    const methodId = `mock-email-mfa-${Date.now()}`

    this.mockMfaMethods.push({
      id: methodId,
      mfa_type: 'email',
      verified: false,
      name: data.name || 'Email MFA',
      created_at: new Date().toISOString(),
    })

    return this.createVoidSuccessResponse()
  }

  async verifyEmailMfa(data: VerifyEmailMFARequest): Promise<AuthavaResult<BackupCodesResponse>> {
    this.log('Mock verify email MFA with:', data)

    // Simulate validation
    if (!data.code) {
      return this.createErrorResponse('Verification code is required')
    }

    // Check if user is logged in
    if (this.currentState.status !== 'valid' || !this.currentState.user) {
      return this.createErrorResponse('Not authenticated', '401', 401)
    }

    // Find the unverified email MFA method and mark it as verified
    const emailMethod = this.mockMfaMethods.find((m) => m.mfa_type === 'email' && !m.verified)

    if (emailMethod) {
      emailMethod.verified = true
      emailMethod.last_used_at = new Date().toISOString()
    }

    // Generate mock backup codes
    const backupCodes = Array.from(
      { length: 10 },
      (_, i) => `MOCK-${i.toString().padStart(4, '0')}`,
    )

    return this.createSuccessResponse<BackupCodesResponse>({ codes: backupCodes })
  }

  async setupTotp(data: SetupTOTPRequest): Promise<AuthavaResult<SetupTOTPResponse>> {
    this.log('Mock setup TOTP with:', data)

    // Check if user is logged in
    if (this.currentState.status !== 'valid' || !this.currentState.user) {
      return this.createErrorResponse('Not authenticated', '401', 401)
    }

    // Create mock MFA method
    const methodId = `mock-totp-mfa-${Date.now()}`

    this.mockMfaMethods.push({
      id: methodId,
      mfa_type: 'totp',
      verified: false,
      name: data.name || 'TOTP MFA',
      created_at: new Date().toISOString(),
    })

    // Create mock response
    const response: SetupTOTPResponse = {
      secret: 'MOCKSECRETKEY123456',
      qr_code:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      method_id: methodId,
    }

    return this.createSuccessResponse<SetupTOTPResponse>(response)
  }

  async verifyTotp(data: VerifyTOTPRequest): Promise<AuthavaResult<BackupCodesResponse>> {
    this.log('Mock verify TOTP with:', data)

    // Simulate validation
    if (!data.method_id || !data.code) {
      return this.createErrorResponse('Method ID and code are required')
    }

    // Check if user is logged in
    if (this.currentState.status !== 'valid' || !this.currentState.user) {
      return this.createErrorResponse('Not authenticated', '401', 401)
    }

    // Find the method and mark it as verified
    const method = this.mockMfaMethods.find((m) => m.id === data.method_id)

    if (method) {
      method.verified = true
      method.last_used_at = new Date().toISOString()
    } else {
      return this.createErrorResponse('MFA method not found', '404', 404)
    }

    // Generate mock backup codes
    const backupCodes = Array.from(
      { length: 10 },
      (_, i) => `MOCK-${i.toString().padStart(4, '0')}`,
    )

    return this.createSuccessResponse({ codes: backupCodes })
  }
}
