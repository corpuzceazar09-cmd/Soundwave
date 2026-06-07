# Editor Portal

**Path:** `src/app/(editor)/`

This directory contains the **Editor Dashboard** screens within the Expo mobile app. Editors review, enrich, and publish podcast content.

## Route Structure

| File | Screen | Description |
|------|--------|-------------|
| `_layout.tsx` | Editor Layout | Sidebar navigation + topbar wrapper |
| `index.tsx` | Editor Dashboard | Content management overview |

## Run Command

From the `Soundwave/` directory:

```bash
npm start
```

## Also See

The **Editor Web App** is a separate Node.js server at `Editor/`:

```bash
cd Editor
node server.js
```

It runs on `http://localhost:8080` and uses MongoDB for storage.
