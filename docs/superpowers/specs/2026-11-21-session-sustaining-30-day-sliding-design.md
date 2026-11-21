# 30-Day Sliding Session Sustaining Design

**Date**: 2026-11-21  
**Status**: Approved  
**Reference**: Modeled after `nippon-hrms` desktop web session persistence architecture.

---

## 1. Problem Statement

Recruiters and admins using `hr-recruit` frequently get logged out unexpectedly. This occurs because:
1. Access tokens are generated with a hard-coded 8-hour expiration (`ACCESS_TOKEN_EXPIRE_MINUTES = 480`).
2. There is no session refresh mechanism or sliding window. If a recruiter closes their laptop overnight, their token is dead the next morning.
3. The frontend (`frontend/src/api/client.ts`) immediately purges `localStorage` and triggers `auth:expired` upon receiving a single `401 Unauthorized` response, kicking the user straight to `/login` without attempting any token refresh or request retry.

In contrast, `nippon-hrms` sustains sessions seamlessly across days and weeks by using 30-day tokens, auto-refreshing in the background, and intercepting `401` errors with silent token renewal and request auto-retry.

---

## 2. Goals & Non-Goals

### Goals
- **Sustain Sessions for 30 Days**: A user who signs in stays logged in for up to 30 days without interruption as long as they use the application.
- **Sliding Session Renewal**: Active use of the application refreshes the 30-day window periodically.
- **Seamless 401 Interceptor**: Catch transient token expiration (`401`) on any API endpoint, refresh the token silently, and replay the original request transparently without interrupting the user.
- **Immediate Inactive User Enforcement**: If an admin disables a user account (`is_active = False`), the backend rejects requests with `403 Forbidden` and terminates the session immediately.
- **Zero Database Migrations**: No schema alterations or new tables in Supabase PostgreSQL.

### Non-Goals
- Multi-device session revocation management UI (listing active devices/IPs in admin settings).

---

## 3. Architecture & Technical Design

### 3.1 Backend Changes (`backend/`)

#### 1. Configuration (`app/core/config.py`)
- Change default `access_token_expire_minutes` from `480` (8 hours) to `43200` (30 days = $30 \times 24 \times 60$ minutes).
- Update `.env.example` to document `ACCESS_TOKEN_EXPIRE_MINUTES=43200`.

#### 2. Refresh Endpoint (`POST /api/v1/auth/refresh`)
- Route: `backend/app/api/v1/auth.py`
- Authentication dependency: `get_current_active_user` (reads token from `Authorization: Bearer` or cookie, validates signature, looks up user in database, and ensures `is_active` is True).
- Logic:
  - Generates a new access token for the authenticated user with a fresh 30-day expiration.
  - Updates the `access_token` cookie (HttpOnly, Secure in production, SameSite=lax).
  - Returns `TokenResponse` containing `access_token`, `token`, and `user` object.
- Behavior on inactive/deleted user:
  - Returns `403 Forbidden` if `is_active` is False.
  - Returns `401 Unauthorized` if token signature is completely invalid or expired beyond the grace period.

### 3.2 Frontend Changes (`frontend/`)

#### 1. API Client Interceptor & Refresh (`frontend/src/api/client.ts`)
- Maintain a single in-flight `refreshPromise: Promise<string | null> | null` to prevent stampeding herd / race conditions when multiple API calls trigger 401 simultaneously.
- Function `refreshAccessToken(): Promise<string | null>`:
  - If a refresh is already in progress, await the existing `refreshPromise`.
  - Issue `POST /auth/refresh` with current bearer token.
  - On success:
    - Save new token to `localStorage` (`access_token`).
    - Save `token_timestamp` to `localStorage`.
    - Return new token.
  - On failure (401 or 403):
    - Clear `localStorage` (`user`, `access_token`, `token_timestamp`).
    - Dispatch `AUTH_EXPIRED_EVENT`.
    - Return `null`.
- In `executeRequest(method, endpoint, body, config)`:
  - Add an internal retry guard `config?._isRetry`.
  - If `response.status === 401` and `endpoint !== '/auth/login'` and `endpoint !== '/auth/refresh'`:
    - If `!config?._isRetry`:
      - Call `await refreshAccessToken()`.
      - If a new token is obtained, retry `executeRequest(method, endpoint, body, { ...config, _isRetry: true })` with updated headers.
      - Return the retried response.
    - If refresh fails or `config?._isRetry` is already true:
      - Purge `user` and `access_token` from `localStorage`.
      - Dispatch `AUTH_EXPIRED_EVENT`.

#### 2. Proactive Session Sliding (`frontend/src/auth/AuthContext.tsx`)
- On initial mount of `AuthProvider`:
  - Check `token_timestamp` in `localStorage`.
  - If token was issued > 24 hours ago, trigger a background silent `refreshAccessToken()` to keep the 30-day window fresh.
- On window focus / tab visibility change:
  - If user returns to tab after a day, quietly trigger background refresh if needed.

---

## 4. Error Handling & Edge Cases

| Scenario | Behavior |
|---|---|
| User working actively | Seamless. Every 24 hours or on token expiry, token is renewed without user notification. |
| User closes tab/browser for 10 days | When reopening, existing token is valid (within 30 days). App loads instantly; background refresh slides window for another 30 days. |
| User inactive for > 30 days | Token expired. Refresh returns 401. App cleans up storage and shows "Your session has expired. Please sign in again." |
| Admin marks user inactive in DB | Next API call returns 403 Forbidden. Session terminates immediately. |
| 5 API calls hit 401 at the exact same moment on page load | `refreshPromise` ensures exactly ONE `/auth/refresh` request is made. All 5 calls await the single refresh and replay together. |
| User clicks "Logout" button | Clears `localStorage`, calls `/auth/logout` to clear cookie, redirects to `/login`. |

---

## 5. Testing & Verification

1. **Backend Unit Tests**:
   - Test `POST /api/v1/auth/refresh` with valid token returns new 30-day token.
   - Test `POST /api/v1/auth/refresh` with inactive user returns 403.
   - Test `POST /api/v1/auth/refresh` without token returns 401.
2. **Frontend Dual Build Verification**:
   - `cd frontend && npm run build` to ensure type-checking and bundle compilation pass cleanly.
3. **End-to-End Simulation**:
   - Verify token storage, refresh concurrency, and auto-retry handling.
