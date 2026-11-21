# 30-Day Sliding Session Sustaining Implementation Plan

> **For agentic workers:** Execute the tasks inline in order; keep the changes small and run each verification command before moving to the next task.

**Goal:** Provide 30-day continuous login session sustaining for `hr-recruit` matching the `nippon-hrms` experience, with silent background refresh, a FastAPI refresh endpoint, and a transparent 401 auto-retry interceptor.

**Architecture:**
- Backend: Update JWT access token duration to 30 days (43,200 minutes) and provide `POST /api/v1/auth/refresh` protected by `get_current_active_user`.
- Frontend: Implement a 401 response interceptor in `client.ts` that catches expired tokens, calls `/auth/refresh`, and transparently replays the original request without user interruption. Add coalescing for concurrent requests and proactive sliding on page load/focus.

**Tech Stack:** FastAPI, SQLAlchemy, Jose/JWT, React, TypeScript, Vite, pytest.

---

### Task 1: Backend 30-Day Configuration & Refresh Endpoint

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/api/v1/auth.py`
- Create: `backend/tests/test_auth_refresh.py`

**Details:**
1. In `backend/app/core/config.py`, change `access_token_expire_minutes: int = 43200` (30 days).
2. In `backend/app/api/v1/auth.py`, implement `POST /refresh` endpoint:
   ```python
   @router.post("/refresh", response_model=TokenResponse)
   def refresh_token(
       response: Response,
       current_user: User = Depends(get_current_active_user),
   ) -> TokenResponse:
       frontend_role = role_for_frontend(current_user.role)
       token = create_access_token(
           user_id=current_user.id,
           email=current_user.email,
           role=frontend_role,
       )
       response.set_cookie(
           key="access_token",
           value=token,
           httponly=True,
           secure=settings.is_production,
           samesite="lax",
           max_age=settings.access_token_expire_minutes * 60,
       )
       return TokenResponse(
           access_token=token,
           token=token,
           user=UserOut.from_user(current_user),
       )
   ```
3. Create unit tests in `backend/tests/test_auth_refresh.py`:
   - Test refreshing with active user succeeds and returns new valid token.
   - Test refreshing with unauthenticated request returns 401.
   - Test refreshing with inactive user returns 403.

**Verification:**
```bash
backend/.venv/bin/pytest backend/tests/test_auth_refresh.py
```

---

### Task 2: Frontend 401 Interceptor with Auto-Retry & Coalesced Refresh

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/auth/AuthContext.tsx`

**Details:**
1. In `frontend/src/api/client.ts`:
   - Store and retrieve `token_saved_at` timestamp.
   - Implement `refreshAccessToken(): Promise<string | null>`:
     - Coalesce concurrent requests into a single in-flight `refreshPromise`.
     - Send `POST /auth/refresh` with current token.
     - On 200: save new token and timestamp, return new token.
     - On 401/403: clear stored auth and dispatch `AUTH_EXPIRED_EVENT`.
   - Update `executeRequest`:
     - Accept optional `_isRetry?: boolean` in `RequestConfig`.
     - When `response.status === 401` on non-login/non-refresh endpoints:
       - If `!config?._isRetry`:
         - Call `await refreshAccessToken()`.
         - If new token returned: retry request with `_isRetry: true`.
       - If refresh fails or `_isRetry` is already true: clear storage and dispatch `AUTH_EXPIRED_EVENT`.
2. In `frontend/src/auth/AuthContext.tsx`:
   - Save `token_saved_at` on login.
   - Add a proactive check in `useEffect`: if token was saved > 24 hours ago, trigger a background silent `refreshAccessToken()` to slide the 30-day window forward.
   - Listen to `visibilitychange` / `window.onfocus` to slide token when returning to tab after an extended period.

**Verification:**
```bash
cd frontend && npm run build
```

---

### Task 3: Full End-to-End Verification & Documentation Commit

**Details:**
1. Run backend test suite.
2. Run frontend type-check and production build.
3. Verify backward compatibility with existing login and role handling.
4. Commit changes with clear, semantic commit messages.
