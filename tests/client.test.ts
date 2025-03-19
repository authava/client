import { AuthavaClient } from '../src/client'

let store: Record<string, string> = {}

const localStorageMock: Storage = {
  getItem: jest.fn((key: string) => {
    return store[key] || null
  }),
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

global.localStorage = localStorageMock

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock BroadcastChannel
class MockBroadcastChannel {
  constructor(public name: string) {}
  postMessage = jest.fn()
  onmessage = jest.fn()
  close = jest.fn()
}
// @ts-ignore
global.BroadcastChannel = MockBroadcastChannel

// Mock window (override location so we can test redirects)
Object.defineProperty(global, 'window', {
  value: {
    setTimeout: jest.fn(),
    clearTimeout: jest.fn(),
    fetch: mockFetch,
    location: { href: '' },
  },
  writable: true,
})

// Mock document
Object.defineProperty(global, 'document', {
  value: {
    cookie:
      'session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJ0ZW5hbnQiOiJhdXRoLmV4YW1wbGUuY29tIiwiZXhwIjoxNzEwODkwMDAwLCJpYXQiOjE3MTA4MDM2MDB9.KzF_nJB7RPp7ZB8KXNfnNwVSWh4g2i3NDxIJ0eI4_0M',
  },
  writable: true,
})

describe('AuthavaClient', () => {
  beforeEach(() => {
    // Clear all mocks and reset window.location.href and localStorage
    jest.clearAllMocks()
    window.location.href = ''
    localStorage.clear()
  })

  afterAll((done) => {
    done()
  })

  it('should create instance with default config', () => {
    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })
    expect(client).toBeInstanceOf(AuthavaClient)
  })

  it('should get session successfully', async () => {
    const mockSession = {
      user: {
        id: '123',
        email: 'test@example.com',
      },
      redirect_url: 'https://example.com',
    }

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSession),
      }),
    )

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    const session = await client.getSession()
    expect(session).toEqual(mockSession)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://auth.example.com/session',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          host: 'auth.example.com',
        },
      }),
    )
  })

  it('should not logout if session has valid user data', async () => {
    const validSession = {
      user: { id: '123', email: 'stay@logged.in' },
      redirect_url: 'https://example.com/dashboard',
    }

    const logoutSpy = jest.spyOn(AuthavaClient.prototype, 'logout')

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(validSession),
      }),
    )

    const client = new AuthavaClient({ domain: 'auth.example.com' })

    const session = await client.getSession()

    expect(session).toEqual(validSession)
    expect(logoutSpy).not.toHaveBeenCalled()
    expect((client as any).currentState.status).toBe('valid')
    expect((client as any).currentState.user).toEqual(validSession.user)

    logoutSpy.mockRestore()
  })

  it('should handle session error', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')))

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    const session = await client.getSession()
    expect(session).toBeNull()
  })

  it('should notify subscribers of session changes', async () => {
    const mockSession = {
      user: {
        id: '123',
        email: 'test@example.com',
      },
      redirect_url: 'https://example.com',
    }

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSession),
      }),
    )

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    const callback = jest.fn()
    client.onSessionChange(callback)

    await client.getSession()

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'valid',
        user: mockSession.user,
      }),
    )
  })

  it('should handle session error', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')))

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    const session = await client.getSession()
    expect(session).toBeNull()
  })

  it('should handle unauthorized session (401) by logging out', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    const session = await client.getSession()
    expect(session).toBeNull()
    expect(window.location.href).toBe(
      'https://auth.example.com?reason=unauthorized&next=aHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tP3JlYXNvbj11bmF1dGhvcml6ZWQ',
    )
  })
  it('should logout after 3 failed network/CORS errors (default redirect)', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')))

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    // Call getSession 3 times to trigger logout
    await client.getSession()
    await client.getSession()
    const session = await client.getSession()

    expect(session).toBeNull()
    expect(window.location.href).toMatch(/^https:\/\/auth\.example\.com\?reason=cors&next=/)
  })

  it('should logout after 3 network/CORS errors with stored redirect', async () => {
    localStorage.setItem('redirect_after_logout', 'https://example.com/redirect')
    mockFetch.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')))

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    await client.getSession()
    await client.getSession()
    const session = await client.getSession()

    expect(session).toBeNull()
    expect(window.location.href).toBe(
      'https://auth.example.com?reason=cors&next=aHR0cHM6Ly9leGFtcGxlLmNvbS9yZWRpcmVjdD9yZWFzb249Y29ycw',
    )
    expect(localStorage.getItem('redirect_after_logout')).toBeNull()
  })

  it('should logout after 3 network/CORS errors with default redirect if no redirect is stored', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')))

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    await client.getSession()
    await client.getSession()
    const session = await client.getSession()

    expect(session).toBeNull()
    expect(window.location.href).toBe(
      'https://auth.example.com?reason=cors&next=aHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tP3JlYXNvbj1jb3Jz',
    )
    expect(localStorage.getItem('redirect_after_logout')).toBeNull()
  })

  it('should redirect to URL with reason param when unauthorized', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    await client.getSession()

    expect(window.location.href).toBe(
      'https://auth.example.com?reason=unauthorized&next=aHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tP3JlYXNvbj11bmF1dGhvcml6ZWQ',
    )
  })

  it('should use resolverDomain for URL resolution', async () => {
    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
      redirect_url: 'https://example.com',
    }

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSession),
      }),
    )

    const client = new AuthavaClient({
      domain: 'auth.example.com',
      resolverDomain: 'example.com',
      autoRefresh: false,
    })

    const session = await client.getSession()

    expect(session).toEqual(mockSession)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/session', // URL uses resolverDomain
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          host: 'auth.example.com',
        },
      }),
    )
  })

  it('should merge custom headers into the request', async () => {
    const mockSession = {
      user: { id: '456', email: 'custom@example.com' },
      redirect_url: 'https://example.com',
    }

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSession),
      }),
    )

    const client = new AuthavaClient({
      domain: 'auth.example.com',
      customHeaders: {
        'X-Custom-Header': 'customValue',
        // Override origin header for testing purposes:
        origin: 'https://override.example.com',
      },
    })

    const session = await client.getSession()

    expect(session).toEqual(mockSession)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://auth.example.com/session',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          host: 'auth.example.com',
          origin: 'https://override.example.com',
          'X-Custom-Header': 'customValue',
        },
      }),
    )
  })
})

describe('Logout functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.location.href = ''
    localStorage.clear()
  })

  it('should logout and redirect to auth.example.com when no redirect_after_logout is set', async () => {
    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    await client.logout()

    expect((client as any).currentState.status).toBe('expired')
    expect(window.location.href).toBe('https://auth.example.com')
  })

  it('should logout and redirect to stored redirect_after_logout', async () => {
    localStorage.setItem('redirect_after_logout', 'https://example.com/login')

    const client = new AuthavaClient({
      domain: 'auth.example.com',
    })

    await client.logout()

    expect((client as any).currentState.status).toBe('expired')
    expect(window.location.href).toBe('https://example.com/login')
    expect(localStorage.getItem('redirect_after_logout')).toBeNull()
  })
})

// Helper to generate a valid JWT token string
function createValidJWT(expSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }),
  ).toString('base64')
  const signature = 'signature'
  return `${header}.${payload}.${signature}`
}

describe('AuthavaClient - Edge Cases', () => {
  const domain = 'auth.example.com'
  let originalConsoleError: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset window.location.href and localStorage
    ;(window as any).location.href = ''
    localStorage.clear()
    // Reset document.cookie (simulate browser)
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
    // Spy on console.error to capture errors from subscriber callbacks
    originalConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    originalConsoleError.mockRestore()
  })

  it('should handle malformed session data (missing required user fields)', async () => {
    // Simulate fetch returning a response with incomplete user data.
    const malformedResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: '123' }, // missing email
        }),
    }
    // Provide two mocked responses: one for the constructor's checkSession and one for our explicit call.
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(malformedResponse as any)
      .mockResolvedValueOnce(malformedResponse as any)

    const client = new AuthavaClient({ domain })
    const session = await client.getSession()
    // Expect the client to catch the malformed session and return null.
    expect(session).toBeNull()
    // And update the internal state to indicate an error.
    expect((client as any).currentState.status).toBe('error')
  })

  it('should handle non-JSON response (json() rejects)', async () => {
    // Simulate fetch where json() rejects (non-JSON response)
    const nonJSONResponse = {
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON')),
    }
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(nonJSONResponse as any)
      .mockResolvedValueOnce(nonJSONResponse as any)

    const client = new AuthavaClient({ domain })
    const session = await client.getSession()
    expect(session).toBeNull()
    expect((client as any).currentState.status).toBe('error')
  })

  it('should update state correctly on receiving a broadcast message', () => {
    const client = new AuthavaClient({ domain })
    const subscriber = jest.fn()
    client.onSessionChange(subscriber)

    // Simulate a broadcast message coming from another tab
    const newState = {
      status: 'valid',
      user: { id: '999', email: 'broadcast@example.com' },
    }
    ;(client as any).handleSessionBroadcast(newState)

    // The subscriber should be notified with the new state.
    expect(subscriber).toHaveBeenCalledWith(newState)
    expect((client as any).currentState).toEqual(newState)
  })

  it('should notify all subscribers on session state update', async () => {
    const validSession = {
      user: { id: '456', email: 'test@example.com' },
      redirect_url: 'https://example.com',
    }
    const validResponse = {
      ok: true,
      json: () => Promise.resolve(validSession),
    }
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(validResponse as any)
      .mockResolvedValueOnce(validResponse as any)

    const client = new AuthavaClient({ domain })
    const subscriber1 = jest.fn()
    const subscriber2 = jest.fn()

    client.onSessionChange(subscriber1)
    client.onSessionChange(subscriber2)

    await client.getSession()

    expect(subscriber1).toHaveBeenCalledWith(expect.objectContaining({ status: 'valid' }))
    expect(subscriber2).toHaveBeenCalledWith(expect.objectContaining({ status: 'valid' }))
  })

  it('should schedule auto refresh if a valid token cookie is present', async () => {
    jest.useFakeTimers()
    // Create a valid JWT that expires in 60 minutes.
    const token = createValidJWT(3600)
    document.cookie = `session=${token}; path=/;`

    const validSession = {
      user: { id: '789', email: 'autorefresh@example.com' },
      redirect_url: 'https://example.com',
    }
    const validResponse = {
      ok: true,
      json: () => Promise.resolve(validSession),
    }
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(validResponse as any)
      .mockResolvedValueOnce(validResponse as any)

    const client = new AuthavaClient({ domain })
    // Call getSession explicitly to ensure auto-refresh scheduling is processed.
    await client.getSession()
    // Instead of spying on setTimeout (which isn’t a mock), we check that the client’s refreshTimer is set.
    expect((client as any).refreshTimer).toBeDefined()

    // Optionally, advance timers to trigger refreshSession.
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  // it('should handle refreshSession retries and eventually update error state', async () => {
  //   jest.useFakeTimers()
  //   const forcedError = new Error('Forced error')
  //   const client = new AuthavaClient({ domain })
  //   // Override getSession so that it always rejects.
  //   jest.spyOn(client, 'getSession').mockImplementation(async () => Promise.reject(forcedError))
  //   // Ensure no token is available.
  //   jest.spyOn(client as any, 'getTokenFromCookie').mockReturnValue(null)

  //   // Start the refresh process.
  //   const refreshPromise = (client as any).refreshSession(0)

  //   // With maxRetries = 3 and retryDelay = 1000, the delays are 1000, 2000, 4000.
  //   // Advance the timers in steps and flush the pending promises.
  //   jest.advanceTimersByTime(1000)
  //   await Promise.resolve()
  //   jest.advanceTimersByTime(2000)
  //   await Promise.resolve()
  //   jest.advanceTimersByTime(4000)
  //   await Promise.resolve()

  //   await refreshPromise

  //   expect((client as any).currentState.status).toBe('error')
  //   jest.useRealTimers()
  // }, 100000)

  it('should handle subscriber callback errors gracefully', () => {
    const validSession = {
      user: { id: '321', email: 'notsosilent@example.com' },
      redirect_url: 'https://example.com',
    }
    const validResponse = {
      ok: true,
      json: () => Promise.resolve(validSession),
    }
    // Provide two responses for the constructor and explicit call.
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(validResponse as any)
      .mockResolvedValueOnce(validResponse as any)

    const client = new AuthavaClient({ domain })
    // Register a faulty subscriber and catch the error thrown on immediate notification.
    const faultySubscriber = jest.fn(() => {
      throw new Error('Subscriber failure')
    })
    try {
      client.onSessionChange(faultySubscriber)
    } catch (e) {
      // Expected error from the immediate call.
    }
    // Register a good subscriber.
    const goodSubscriber = jest.fn()
    client.onSessionChange(goodSubscriber)

    // Now trigger a state update manually.
    ;(client as any).updateState({
      status: 'valid',
      user: { id: '1', email: 'a@b.com' },
    })

    // The good subscriber should be notified.
    expect(goodSubscriber).toHaveBeenCalledWith(expect.objectContaining({ status: 'valid' }))
    // And the error from the faulty subscriber should have been logged.
    expect(console.error).toHaveBeenCalledWith(
      'Error in session change callback:',
      expect.any(Error),
    )
  })
})
