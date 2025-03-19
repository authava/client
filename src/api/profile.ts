import { BaseApiClient } from './base'
import type {
  ProfileResponse,
  ChangeEmailRequest,
  ChangePasswordRequest,
  UpdateNotificationPreferencesRequest,
  UserNotificationPreferences,
  Uuid,
  ErrorResponse,
} from '../types/index'

/**
 * Profile API client
 */
export class ProfileApi extends BaseApiClient {
  /**
   * Get user profile information
   */
  async getProfile(): Promise<ProfileResponse | ErrorResponse> {
    return this.request<ProfileResponse>('/v1/profile', 'GET')
  }

  /**
   * Change email address
   */
  async changeEmail(data: ChangeEmailRequest): Promise<void | ErrorResponse> {
    return this.request<void>('/v1/profile/email', 'PUT', data)
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequest): Promise<void | ErrorResponse> {
    return this.request<void>('/v1/profile/password', 'PUT', data)
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    data: UpdateNotificationPreferencesRequest,
  ): Promise<UserNotificationPreferences | ErrorResponse> {
    return this.request<UserNotificationPreferences>('/v1/profile/notifications', 'PUT', data)
  }

  /**
   * Remove an MFA method
   */
  async removeMfaMethod(methodId: Uuid): Promise<void | ErrorResponse> {
    return this.request<void>(`/v1/profile/mfa/${methodId}`, 'DELETE')
  }
}
