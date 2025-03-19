# @authava/client

A lightweight client library for seamless integration with Authava's white-label authentication service.

## Installation

```bash
npm install @authava/client
```

## Quick Start

```typescript
import { AuthavaClient } from '@authava/client';

// Initialize the client
const authava = new AuthavaClient({
  domain: 'auth.yourdomain.com'  // Your white-labeled Authava domain
});

// Get current session
const session = await authava.getSession();
if (session) {
  console.log('User is logged in:', session.user);
} else {
  console.log('No active session');
}
```

## Features

- 🚀 Zero dependencies
- 🔒 Automatic session handling
- 🌐 TypeScript support
- 🎨 White-label domain support
- 🍪 Cookie-based session management
- 📱 Cross-tab session synchronization
- 🔄 Automatic session refresh
- 🔐 Multi-factor authentication (MFA) support
- 👤 User profile management
- 📧 Email change and verification
- 🔑 Password reset and recovery
- 🔔 Notification preferences management

## Configuration

```typescript
interface AuthavaConfig {
  domain: string;          // Your Authava domain (e.g., auth.yourdomain.com)
  resolverDomain?: string; // Domain for API requests (defaults to domain)
  secure?: boolean;        // Use HTTPS (default: true)
  autoRefresh?: boolean;   // Auto refresh session (default: true)
  refreshBuffer?: number;  // Minutes before expiration to refresh (default: 5)
  customHeaders?: Record<string, string> | (() => Record<string, string>); // Custom headers for API requests
  debug?: boolean;         // Enable debug logging (default: false)
}
```

## API Reference

### Authentication

```typescript
// Login with email and password
const loginResponse = await authava.login({
  email: 'user@example.com',
  password: 'secure-password'
});

// Register a new user
const registerResponse = await authava.register({
  email: 'newuser@example.com',
  password: 'secure-password'
});

// Request a password reset
const forgotResponse = await authava.forgotPassword({
  email: 'user@example.com'
});

// Reset password with token
const resetResponse = await authava.resetPassword({
  token: 'reset-token-from-email',
  password: 'new-secure-password'
});

// Logout the current user
await authava.logout();
```

### Multi-Factor Authentication (MFA)

```typescript
// Setup Email MFA
const setupEmailResponse = await authava.setupEmailMfa({
  name: 'My Email MFA'
});

// Verify Email MFA
const verifyEmailResponse = await authava.verifyEmailMfa({
  code: '123456'
});

// Setup TOTP MFA (e.g., Google Authenticator)
const setupTotpResponse = await authava.setupTotp({
  name: 'My Authenticator'
});

// Verify TOTP MFA
const verifyTotpResponse = await authava.verifyTotp({
  method_id: setupTotpResponse.data.method_id,
  code: '123456'
});

// Remove an MFA method
await authava.removeMfaMethod('mfa-method-id');

// Verify MFA during login
const verifyMfaResponse = await authava.verifyMfa({
  session_id: 'session-id',
  method_id: 'mfa-method-id',
  code: '123456'
});

// Send MFA verification email
await authava.sendMfaEmail({
  session_id: 'session-id',
  method_id: 'mfa-method-id'
});
```

### User Profile Management

```typescript
// Get user profile information
const profileResponse = await authava.getProfile();

// Change email address
const changeEmailResponse = await authava.changeEmail({
  new_email: 'newemail@example.com',
  password: 'current-password'
});

// Change password
const changePasswordResponse = await authava.changePassword({
  current_password: 'current-password',
  new_password: 'new-secure-password'
});

// Update notification preferences
const updateNotificationsResponse = await authava.updateNotificationPreferences({
  security_alerts: true,
  account_activity: true,
  product_updates: false,
  marketing_emails: false
});
```

### Response Handling

All API methods return a consistent response format:

```typescript
interface T;

interface ErrorResponse {
  error: String;
};

// Example usage
const response = await authava.login({
  email: 'user@example.com',
  password: 'password'
});

if (response.error) {
  console.error('Login failed:', response.error);
  return;
}

console.log('Login successful:', response.data);
```

## Session Management

The client automatically handles session management, including:
- Automatic session refresh before expiration
- Cross-tab session synchronization
- Error handling and retry logic

### Session States

Sessions can be in one of the following states:
- `valid`: Session is active and valid
- `refreshing`: Session is being refreshed
- `expired`: Session has expired
- `error`: An error occurred

### Subscribing to Session Changes

```typescript
const unsubscribe = authava.onSessionChange((state) => {
  switch (state.status) {
    case 'valid':
      console.log('Session is valid:', state.user);
      break;
    case 'refreshing':
      console.log('Refreshing session...');
      break;
    case 'expired':
      console.log('Session has expired');
      break;
    case 'error':
      console.error('Session error:', state.error);
      break;
  }
});

// Later: cleanup subscription
unsubscribe();
```

## Framework Integration Examples

### React Integration

```typescript
import { useEffect, useState } from 'react';
import { AuthavaClient, AuthavaUser, ProfileResponse } from '@authava/client';

const authava = new AuthavaClient({
  domain: 'auth.yourdomain.com'
});

function App() {
  const [user, setUser] = useState<AuthavaUser | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    authava.getSession().then(session => {
      if (session) {
        setUser(session.user);

        // Fetch user profile
        authava.getProfile().then(response => {
          if (response.data) {
            setProfile(response.data);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for session changes
    return authava.onSessionChange(state => {
      setUser(state.status === 'valid' ? state.user : null);

      // Fetch profile when session becomes valid
      if (state.status === 'valid' && state.user) {
        authava.getProfile().then(response => {
          if (response.data) {
            setProfile(response.data);
          }
        });
      } else if (state.status !== 'valid') {
        setProfile(null);
      }
    });
  }, []);

  // Login handler
  const handleLogin = async (email: string, password: string) => {
    const response = await authava.login({ email, password });

    if (response.error) {
      console.error('Login failed:', response.error);
      return false;
    }

    return true;
  };

  // Profile update handler
  const updateNotifications = async (preferences: {
    security_alerts: boolean;
    account_activity: boolean;
    product_updates: boolean;
    marketing_emails: boolean;
  }) => {
    const response = await authava.updateNotificationPreferences(preferences);

    if (response) {
      // Update local profile state
      setProfile(prev => prev ? {
        ...prev,
        notification_preferences: response
      } : null);

      return true;
    }

    return false;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        <h2>Login</h2>
        <LoginForm onSubmit={handleLogin} />
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {user.email}!</h1>

      {profile && (
        <div>
          <h2>Your Profile</h2>
          <p>Email: {profile.user.email}</p>
          <p>Status: {profile.user.status}</p>

          <h3>MFA Methods</h3>
          <ul>
            {profile.mfa_methods.map(method => (
              <li key={method.id}>
                {method.mfa_type} - {method.verified ? 'Verified' : 'Not Verified'}
                <button onClick={() => authava.removeMfaMethod(method.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <h3>Notification Preferences</h3>
          <NotificationForm
            preferences={profile.notification_preferences}
            onUpdate={updateNotifications}
          />
        </div>
      )}

      <button onClick={() => authava.logout()}>Logout</button>
    </div>
  );
}
```

### Next.js Integration

```typescript
// utils/authava.ts
import { AuthavaClient } from '@authava/client';

export const authava = new AuthavaClient({
  domain: process.env.NEXT_PUBLIC_AUTHAVA_DOMAIN!
});

// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { authava } from '../utils/authava';
import type { AuthavaUser, ProfileResponse } from '@authava/client';

export function useAuth() {
  const [user, setUser] = useState<AuthavaUser | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    authava.getSession().then(session => {
      if (session) {
        setUser(session.user);

        // Fetch user profile
        authava.getProfile().then(response => {
          if (response.data) {
            setProfile(response.data);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for session changes
    return authava.onSessionChange(state => {
      setUser(state.status === 'valid' ? state.user : null);

      if (state.status === 'valid' && state.user) {
        authava.getProfile().then(response => {
          if (response.data) {
            setProfile(response.data);
          }
        });
      } else if (state.status !== 'valid') {
        setProfile(null);
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authava.login({ email, password });
    return response;
  };

  const register = async (email: string, password: string) => {
    const response = await authava.register({ email, password });
    return response;
  };

  const logout = () => authava.logout();

  const changePassword = async (currentPassword: string, newPassword: string) => {
    return authava.changePassword({
      current_password: currentPassword,
      new_password: newPassword
    });
  };

  return {
    user,
    profile,
    loading,
    login,
    register,
    logout,
    changePassword,
    authava, // Expose the client for advanced usage
  };
}

// pages/_app.tsx
import { useEffect } from 'react';
import { authava } from '../utils/authava';
import { AuthProvider } from '../context/AuthContext';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Initialize session
    authava.getSession();
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

// context/AuthContext.tsx
import { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);

// pages/profile.tsx
import { useAuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';

export default function ProfilePage() {
  const { user, profile, loading, logout } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Email: {profile.user.email}</p>

      <h2>MFA Methods</h2>
      <ul>
        {profile.mfa_methods.map(method => (
          <li key={method.id}>
            {method.mfa_type} - {method.verified ? 'Verified' : 'Not Verified'}
          </li>
        ))}
      </ul>

      <button onClick={() => router.push('/profile/setup-mfa')}>
        Setup MFA
      </button>

      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Security Considerations

- All communication with the Authava server is done over HTTPS by default
- Session tokens are stored in secure, HTTP-only cookies
- Cross-tab synchronization is handled securely using the BroadcastChannel API
- Automatic session refresh helps prevent session expiration
- Error handling includes exponential backoff for failed requests
- Multi-factor authentication (MFA) provides an additional layer of security
- Backup codes are provided when setting up MFA methods
- Password changes require verification of the current password
- Email changes require password verification
- Security events are tracked and available in the user profile
- Notification preferences allow users to stay informed about security events

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## License

MIT