# Fix: Admin Auth Timeout Error

## TL;DR

> **Quick Summary**: The Supabase project at `https://ardlvylyrocjjokcpesj.supabase.co` is paused and returns "Invalid API key". The app keeps trying to connect to it, triggering an 8-second timeout that shows "Unable to connect to authentication service". Fix: bypass all Supabase auth calls and run entirely in demo/mock mode.
>
> **Deliverables**:
> - `src/lib/auth.tsx` — stripped down to pure demo mode, no Supabase calls
> - `src/app/index.tsx` — login screen uses mock login for all email patterns
>
> **Estimated Effort**: Quick (< 30 min)
> **Parallel Execution**: NO (sequential — 2 files, auth then login)

---

## Context

### The Problem

1. `isMockMode()` checks if `EXPO_PUBLIC_SUPABASE_URL` is empty or contains `'placeholder'`
2. The `.env` has a REAL Supabase URL (paused project), so `isMockMode()` returns `false`
3. The app tries `supabase.auth.getSession()` → this cascades through:
   - `initializePromise` → `_recoverAndRefresh()` → reads localStorage → finds nothing → returns null
4. Auth resolves with `session: null, role: null, loading: false`
5. Admin layout's effect sees `role !== 'Admin'` → calls `router.replace('/')`
6. Login screen tries `supabase.auth.signInWithPassword()` → API key is invalid → fails with `"Invalid API key"`
7. User is stuck in a redirect/error loop

### What We Need

- Bypass ALL Supabase calls entirely
- Run in permanent demo/mock mode
- Login screen selects role based on email pattern (`admin` → Admin role)
- All routes work without auth

---

## Work Objectives

### Core Objective
Make the Soundwave admin app work entirely in demo mode without any Supabase connection.

### Definition of Done
- [ ] Opening `http://localhost:8083/` shows a login screen
- [ ] Entering `admin@demo.com` + any password navigates to admin dashboard
- [ ] Admin dashboard shows sidebar, stats cards, and bottom section
- [ ] No "Unable to connect to authentication service" error appears

### Must Have
- [ ] Zero Supabase API calls during app startup
- [ ] Login determines role from email text pattern
- [ ] Admin sidebar renders correctly

### Must NOT Have
- [ ] No auth timeout errors
- [ ] No network errors on startup
- [ ] No redirect loops

---

## Verification Strategy

### QA Policy
Manual browser testing — open `http://localhost:8083/`, enter `admin@demo.com` + any password, verify admin loads with sidebar.

### Test Decision
- **Automated tests**: None (this is a runtime config fix)
- **Agent QA**: Open browser, log in, verify sidebar visible, no error messages

---

## New Issue: Infinite Re-render Loop

After the previous partial fixes, the app crashes with:

```
Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

**Root cause**: Expo Router route groups (`(admin)`) don't add to the URL. Both `app/index.tsx` (login) and `app/(admin)/index.tsx` (dashboard) exist at URL `/`. When the admin layout calls `router.replace('/')`, it's replacing with the same URL — the navigation is a no-op, so the component stays mounted, its `useEffect` fires again calling `router.replace('/')` again → infinite loop.

**Fix**: Add a `useRef` guard in the admin layout to prevent calling `router.replace('/')` more than once. Combined with `isMockMode() = true` in `auth.tsx`, the admin layout will skip the redirect entirely (it takes the `isMockMode()` branch which just sets `checking = false`).

---

## Execution Strategy

3 sequential tasks — no parallelism (each depends on previous).

---

## TODOs

- [ ] 1. Turn `isMockMode()` to always return `true`

  **What to do**:
  In `src/lib/auth.tsx`:
  - Change `isMockMode()` to `() => true` (hardcoded, since Supabase project is paused)
  - Remove the entire `useEffect` block that calls `supabase.auth.getSession()` and `onAuthStateChange`
  - Replace with just `setLoading(false)` — no Supabase interaction at all
  - Remove `fetchRole()` function (no longer needed)
  - Keep `mockLogin()` function for role assignment
  - Keep `signOut()` function (just removes local state)
  - Keep `isMockMode` export

  Example of what the AuthProvider should look like:
  ```tsx
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<AppRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      setLoading(false);
    }, []);

    const mockLogin = (email: string) => {
      if (email.includes('admin')) setRole('Admin');
      else if (email.includes('editor')) setRole('Editor');
      else setRole('User');
    };

    const signOut = async () => {
      setSession(null);
      setRole(null);
    };

    return (
      <AuthContext.Provider value={{ session, role, loading, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
    - Simple text edits to a single file

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: Must be done first

  **References**:
  - `src/lib/auth.tsx:26-28` — Current `isMockMode()` implementation to replace

  **Acceptance Criteria**:
  - [ ] `isMockMode()` exported function returns `true`
  - [ ] AuthProvider's useEffect only calls `setLoading(false)`
  - [ ] No imports of `supabase` remain in use
  - [ ] `fetchRole` function removed

  **QA Scenarios**:
  ```
  Scenario: App loads without Supabase calls
    Tool: Bash (curl + grep)
    Preconditions: Expo dev server running at localhost:8083
    Steps:
      1. Load the app at http://localhost:8083/
      2. Check the page loads without errors
    Expected Result: Login screen renders, no "Unable to connect" message
    Evidence: .omo/evidence/task-1-app-loads.txt
  ```

  **Commit**: YES
  - Message: `fix(auth): force demo mode, bypass all Supabase auth calls`
  - Files: `src/lib/auth.tsx`

- [ ] 2. Fix login screen to use mock login for all inputs

  **What to do**:
  In `src/app/index.tsx`:
  - The login screen already checks `isMockMode()` at the top of `onSubmit`
  - Since `isMockMode()` now returns `true`, the Supabase `signInWithPassword` block is **dead code**
  - Remove the Supabase-based auth block entirely:
    ```tsx
    if (isMockMode()) {
      const role = mockLogin(data.email);
      navigateByRole(role);
      return;
    }
    // REMOVE everything below this — it's dead code
    ```
  - Keep `mockLogin` import, remove `supabase` import if no longer used elsewhere
  - Verify Zod validation still works (email format, password length)
  - Any email containing `admin` navigates to `/(admin)` (dashboard)
  - Any email containing `editor` navigates to `/(editor)`
  - Any other email navigates to `/(user)`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1 (needs `isMockMode()` to return `true`)

  **References**:
  - `src/app/index.tsx:55-88` — Current login handler to simplify
  - `src/lib/auth.tsx:mockLogin` — Role mapping function

  **Acceptance Criteria**:
  - [ ] Login form accepts any email/password
  - [ ] `admin@demo.com` navigates to admin dashboard
  - [ ] `editor@demo.com` navigates to editor route
  - [ ] `user@test.com` navigates to user route
  - [ ] Zod validation still enforces email format and 8-char password
  - [ ] No Supabase imports or calls remain in login screen

  **QA Scenarios**:
  ```
  Scenario: Admin login works in demo mode
    Tool: Playwright
    Preconditions: Expo dev server at localhost:8083
    Steps:
      1. Navigate to http://localhost:8083/
      2. Enter email "admin@demo.com"
      3. Enter password "password123!"
      4. Click "Access Admin Console"
      5. Wait for navigation
    Expected Result: Admin dashboard loads with sidebar visible
    Failure Indicators: Error message shown, stays on login page
    Evidence: .omo/evidence/task-2-admin-login.png
  ```

  **Commit**: YES
  - Message: `fix(login): use mock login for all sign-ins, remove Supabase auth path`
  - Files: `src/app/index.tsx`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the actual edits in auth.tsx and index.tsx. Confirm: isMockMode always returns true, no Supabase calls remain in the startup path, login screen uses mockLogin for all inputs.

- [ ] F2. **Manual QA** — Open `http://localhost:8083/`, log in with `admin@demo.com` / `password123!`, verify admin loads with sidebar and no timeout error.

---

## Commit Strategy

- **1**: `fix(auth): force demo mode, bypass all Supabase auth calls` — `src/lib/auth.tsx`
- **2**: `fix(login): use mock login for all sign-ins, remove Supabase auth path` — `src/app/index.tsx`

---

## Success Criteria

### Verification Commands
```bash
# Check that auth.tsx has no Supabase getSession call
grep -c "getSession" src/lib/auth.tsx
# Expected: 0

# Check that isMockMode returns true
grep "isMockMode" src/lib/auth.tsx
# Expected: const isMockMode = () => true;

# Check that login screen has no signInWithPassword call
grep -c "signInWithPassword" src/app/index.tsx
# Expected: 0
```

### Final Checklist
- [ ] Admin loads without timeout error
- [ ] Sidebar visible on admin dashboard
- [ ] Login works with any email/password
- [ ] `admin@` → Admin role
- [ ] `editor@` → Editor role
- [ ] No Supabase network calls on startup
