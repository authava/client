import { BaseApiClient } from './base'
import type {
  SetupEmailMFARequest,
  VerifyEmailMFARequest,
  SetupTOTPRequest,
  SetupTOTPResponse,
  VerifyTOTPRequest,
  BackupCodesResponse,
  AuthavaResult,
} from '../types/index'
import { toAuthavaResult } from '../client'

/**
 * Multi-Factor Authentication API client
 */
export class MfaApi extends BaseApiClient {
  /**
   * Initialize Email MFA setup
   */
  async setupEmailMfa(data: SetupEmailMFARequest): Promise<AuthavaResult<void>> {
    const res = await this.request<void>('/v1/profile/mfa/email/setup', 'POST', data)
    return toAuthavaResult(res)
  }

  /**
   * Verify and activate Email MFA
   */
  async verifyEmailMfa(data: VerifyEmailMFARequest): Promise<AuthavaResult<BackupCodesResponse>> {
    const res = await this.request<BackupCodesResponse>(
      '/v1/profile/mfa/email/verify',
      'POST',
      data,
    )
    return toAuthavaResult(res)
  }

  /**
   * Initialize TOTP MFA setup
   */
  async setupTotp(data: SetupTOTPRequest): Promise<AuthavaResult<SetupTOTPResponse>> {
    const res = await this.request<SetupTOTPResponse>('/v1/profile/mfa/totp/setup', 'POST', data)
    return toAuthavaResult(res)
  }

  /**
   * Verify and activate TOTP MFA
   */
  async verifyTotp(data: VerifyTOTPRequest): Promise<AuthavaResult<BackupCodesResponse>> {
    const res = await this.request<BackupCodesResponse>('/v1/profile/mfa/totp/verify', 'POST', data)
    return toAuthavaResult(res)
  }
}
