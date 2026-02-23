import { describe, expect, it } from 'vitest';
import { mapRingAuthError } from './Settings';

const t = (key: string) => key;

describe('mapRingAuthError', () => {
  it('maps access_denied errors to invalid credentials key', () => {
    const message =
      'Failed to fetch oauth token from Ring. Verify that your email and password are correct. (error: access_denied)';
    expect(mapRingAuthError(message, t)).toBe('ring.error_invalid_credentials');
  });

  it('maps 2fa/authenticator errors to invalid 2fa key', () => {
    expect(
      mapRingAuthError('Please enter the code from your authenticator app', t)
    ).toBe('ring.error_invalid_2fa');
  });

  it('maps expired auth sessions', () => {
    expect(mapRingAuthError('Auth session expired. Please start again.', t)).toBe(
      'ring.error_auth_session_expired'
    );
  });

  it('falls back to original message when no mapping is matched', () => {
    expect(mapRingAuthError('Some other backend error', t)).toBe(
      'Some other backend error'
    );
  });
});

