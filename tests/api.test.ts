/**
 * @jest-environment jsdom
 */

import { AuthavaClient } from '../src/client'
import { ErrorResponse } from '../src/types/index'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock localStorage
let store: Record<string, string> = {}
const localStorageMock: Storage = {
  getItem: jest.fn((key: string) => store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key]
  }),
  clear: jest.fn(() => {
    store = {}
  }),
  key: jest.fn((index: number) => {
    const keys = Object.keys(store)
    return keys[index] || null
  }),
  get length() {
    return Object.keys(store).length
  },
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Reset document.cookie
document.cookie = ''

// Mock window.location
const locationMock = {
  href: '',
}
Object.defineProperty(window, 'location', {
  writable: true,
  value: locationMock,
})

// Helper to create a successful response
function createSuccessResponse(data: any) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers({
      'content-type': 'application/json',
    }),
  }
}

function createTransformedSuccessJsonresponse(data: any) {
  return {
    success: true,
    data: data,
  }
}

// Helper to create an error response
function createErrorResponse(status: number, message: string, code?: number) {
  const errorResponse: ErrorResponse = {
    error: message,
  }

  return {
    ok: false,
    status,
    statusText: message,
    json: jest.fn().mockResolvedValue(errorResponse),
    text: jest.fn().mockResolvedValue(JSON.stringify(errorResponse)),
    headers: new Headers({
      'content-type': 'application/json',
    }),
  }
}

describe('AuthavaClient API', () => {
  let client: AuthavaClient

  beforeEach(() => {
    // Reset mocks
    mockFetch.mockReset()
    document.cookie = ''
    window.location.href = ''
    store = {}

    // Create a new client for each test
    client = new AuthavaClient({
      domain: 'auth.example.com',
      debug: false,
    })
  })

  // ===== Authentication Endpoints =====

  describe('Authentication', () => {
    test('login should make a POST request to /login', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        redirect_url: 'https://dashboard.example.com',
      }

      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockResponse))

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const response = await client.login(loginData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(loginData),
        }),
      )

      expect(response).toEqual(createTransformedSuccessJsonresponse(mockResponse))
    })

    test('login should handle errors', async () => {
      const errorResponse = createErrorResponse(401, 'Invalid credentials')
      mockFetch.mockResolvedValueOnce(errorResponse)

      const loginData = {
        email: 'test@example.com',
        password: 'wrong-password',
      }

      const response = await client.login(loginData)

      expect(response).toEqual({
        error: 'Invalid credentials',
        success: false,
      })
    })

    test('register should make a POST request to /register', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

      const registerData = {
        email: 'new@example.com',
        password: 'password123',
      }

      await client.register(registerData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(registerData),
        }),
      )
    })

    test('forgotPassword should make a POST request to /forgot-password', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

      const forgotPasswordData = {
        email: 'test@example.com',
      }

      await client.forgotPassword(forgotPasswordData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/forgot-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(forgotPasswordData),
        }),
      )
    })

    test('resetPassword should make a POST request to /reset-password', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

      const resetPasswordData = {
        token: 'reset-token-123',
        password: 'new-password',
      }

      await client.resetPassword(resetPasswordData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/reset-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(resetPasswordData),
        }),
      )
    })

    test('verifyMfa should make a POST request to /verify-mfa', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        redirect_url: 'https://dashboard.example.com',
      }

      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockResponse))

      const verifyMfaData = {
        session_id: 'session-123',
        method_id: 'method-123',
        code: '123456',
      }

      const response = await client.verifyMfa(verifyMfaData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/verify-mfa',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(verifyMfaData),
        }),
      )

      expect(response).toEqual(createTransformedSuccessJsonresponse(mockResponse))
    })

    test('sendMfaEmail should make a POST request to /send-mfa-email', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

      const sendMfaEmailData = {
        session_id: 'session-123',
        method_id: 'method-123',
      }

      await client.sendMfaEmail(sendMfaEmailData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/send-mfa-email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(sendMfaEmailData),
        }),
      )
    })
  })

  // ===== Profile Endpoints =====

  describe('Profile', () => {
    test('getProfile should make a GET request to /v1/profile', async () => {
      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          status: 'active',
          email_verified: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        mfa_methods: [],
        notification_preferences: {
          user_id: 'user-123',
          security_alerts: true,
          account_activity: true,
          product_updates: false,
          marketing_emails: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        recent_security_events: [],
      }

      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockResponse))

      const response = await client.getProfile()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/v1/profile',
        expect.objectContaining({
          method: 'GET',
        }),
      )

      expect(response).toEqual(createTransformedSuccessJsonresponse(mockResponse))
    })

    test('changeEmail should make a PUT request to /v1/profile/email', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

      const changeEmailData = {
        new_email: 'new@example.com',
        password: 'password123',
      }

      await client.changeEmail(changeEmailData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/v1/profile/email',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(changeEmailData),
        }),
      )
    })

    test('changePassword should make a PUT request to /v1/profile/password', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

      const changePasswordData = {
        current_password: 'old-password',
        new_password: 'new-password',
      }

      await client.changePassword(changePasswordData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/v1/profile/password',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(changePasswordData),
        }),
      )
    })

    test('updateNotificationPreferences should make a PUT request to /v1/profile/notifications', async () => {
      const mockResponse = {
        user_id: 'user-123',
        security_alerts: true,
        account_activity: false,
        product_updates: true,
        marketing_emails: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockResponse))

      const preferencesData = {
        security_alerts: true,
        account_activity: false,
        product_updates: true,
        marketing_emails: false,
      }

      const response = await client.updateNotificationPreferences(preferencesData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/v1/profile/notifications',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(preferencesData),
        }),
      )

      expect(response).toEqual(createTransformedSuccessJsonresponse(mockResponse))
    })

    test('removeMfaMethod should make a DELETE request to /v1/profile/mfa/{methodId}', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

      const methodId = 'method-123'

      await client.removeMfaMethod(methodId)

      expect(mockFetch).toHaveBeenCalledWith(
        `https://auth.example.com/v1/profile/mfa/${methodId}`,
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })
  })

  // ===== MFA Endpoints =====

  describe('MFA', () => {
    test('setupEmailMfa should make a POST request to /v1/profile/mfa/email/setup', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

      const setupData = {
        name: 'My Email MFA',
      }

      await client.setupEmailMfa(setupData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/v1/profile/mfa/email/setup',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(setupData),
        }),
      )
    })

    test('verifyEmailMfa should make a POST request to /v1/profile/mfa/email/verify', async () => {
      const mockResponse = {
        codes: ['code1', 'code2', 'code3', 'code4', 'code5'],
      }

      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockResponse))

      const verifyData = {
        code: '123456',
      }

      const response = await client.verifyEmailMfa(verifyData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/v1/profile/mfa/email/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(verifyData),
        }),
      )

      expect(response).toEqual(createTransformedSuccessJsonresponse(mockResponse))
    })

    test('setupTotp should make a POST request to /v1/profile/mfa/totp/setup', async () => {
      const mockResponse = {
        secret: 'ABCDEFGHIJKLMNOP',
        qr_code: 'data:image/png;base64,abc123',
        method_id: 'method-123',
      }

      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockResponse))

      const setupData = {
        name: 'My TOTP MFA',
      }

      const response = await client.setupTotp(setupData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/v1/profile/mfa/totp/setup',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(setupData),
        }),
      )

      expect(response).toEqual(createTransformedSuccessJsonresponse(mockResponse))
    })

    test('verifyTotp should make a POST request to /v1/profile/mfa/totp/verify', async () => {
      const mockResponse = {
        codes: ['code1', 'code2', 'code3', 'code4', 'code5'],
      }

      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockResponse))

      const verifyData = {
        method_id: 'method-123',
        code: '123456',
      }

      const response = await client.verifyTotp(verifyData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/v1/profile/mfa/totp/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(verifyData),
        }),
      )

      expect(response).toEqual(createTransformedSuccessJsonresponse(mockResponse))
    })
  })

  // ===== Error Handling =====

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const response = await client.getProfile()

      expect(response).toEqual({
        error: 'Network error',
        success: false,
      })
    })

    test('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(500, 'Internal server error'))

      const response = await client.getProfile()

      expect(response).toEqual({
        error: 'Internal server error',
        success: false,
      })
    })

    test('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(400, 'Invalid email format'))

      const response = await client.register({
        email: 'invalid-email',
        password: 'password123',
      })

      expect(response).toEqual({
        error: 'Invalid email format',
        success: false,
      })
    })

    test('should handle unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(401, 'Unauthorized'))

      const response = await client.getProfile()

      expect(response).toEqual({
        error: 'Unauthorized',
        success: false,
      })
    })
  })
})
