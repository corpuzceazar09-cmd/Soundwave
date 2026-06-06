# Public User Portal

**Path:** `src/app/(user)/`

This directory contains the **Public User** screens — the podcast discovery and listening experience for end users.

## Route Structure

| File | Screen | Description |
|------|--------|-------------|
| `_layout.tsx` | User Layout | Auth-aware layout (full-screen for login/signup, sidebar for dashboard) |
| `login.tsx` | Login | Sign in with email/password or social providers |
| `signup.tsx` | Sign Up | Create a new account |
| `index.tsx` | Home | Discover, featured, trending, player |

## Run Command

From the `Soundwave/` directory:

```bash
npm start
```

## Tech Stack

- **Framework:** Expo (React Native)
- **Auth:** Firebase Authentication
- **Database:** Firebase Firestore
