# Admin Portal

**Path:** `src/app/(admin)/`

This directory contains all **Admin Dashboard** screens for the Podcast Directory platform. The admin manages RSS feeds, ingestion jobs, and system health.

## Route Structure

| File | Screen | Description |
|------|--------|-------------|
| `_layout.tsx` | Admin Layout | Sidebar navigation + topbar wrapper |
| `index.tsx` | Dashboard | Stats, system health, ingestion jobs |

## Run Command

From the `Soundwave/` directory:

```bash
npm start
```

## Tech Stack

- **Framework:** Expo (React Native)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth + RBAC (`user_roles` table)

## Database Credentials

See `../.env` for Supabase URL and anon key.
