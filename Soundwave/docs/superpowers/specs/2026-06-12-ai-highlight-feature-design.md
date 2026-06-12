---
date: 2026-06-12
topic: AI Highlight Feature
status: validated
---

## Problem Statement

The Editor system has no highlight clip management. The `highlights` table exists in Supabase and is queried by the stats endpoint for "pending reviews" count, but there are zero API routes and zero UI for creating, editing, approving, or organizing highlights. The project spec requires the Editor to "automatically generate highlight clips from episodes" and allow editors to "accept, reject, trim, tag, and organize highlights into collections."

## Constraints

- No ML models or external AI APIs — simulated detection via duration heuristics
- Must integrate with existing Editor server (Express, Supabase, vanilla JS frontend)
- Follow existing code patterns in `server.js` and the HTML pages
- Must use the existing `highlights` Supabase table (no schema changes except adding `collection_id`)
- The rich editor page (`rich-editor.html`) is the entry point for episode work

## Approach

**Chosen: Mixed inline + dedicated management (Approach C)**

Editors generate and handle highlights inline on the episode editor page, then organize them into collections on the collections page. This avoids context-switching during the review workflow while still providing a home for collection-level organization.

**Rejected alternatives:**
- Dedicated page only: Forces editors to leave the episode editor to manage highlights, breaking flow
- All-in on rich editor: The page is already 708 lines — adding full collection management there would be too heavy

## Architecture

```
Editor System
├── Rich Editor (rich-editor.html)
│   ├── "Auto-Detect Highlights" button → POST /api/episodes/:id/highlights/detect
│   ├── Highlight card list with inline edit
│   │   ├── Title, description, tags
│   │   ├── Start/end time inputs (seconds)
│   │   └── Status badge (pending / approved / rejected)
│   └── Actions per card: Save | Approve | Reject | Delete
├── Collections (collections.html)
│   ├── Collection detail shows assigned highlights
│   └── Assign/remove highlights to/from collections
└── Server API (server.js)
    ├── GET  /api/episodes/:id/highlights
    ├── POST /api/episodes/:id/highlights/detect
    ├── PUT  /api/highlights/:id
    ├── DELETE /api/highlights/:id
    └── POST /api/highlights/:id/approve
```

## Components

### Simulated AI Detection (`detect` endpoint)

Uses episode duration to generate 3 heuristic-based clips:

| Clip | Position | Title | Duration |
|------|----------|-------|----------|
| 1 | 10%-25% of episode | "Opening Moments" | 15% of total, max 60s |
| 2 | 35%-55% of episode | "Key Discussion" | 20% of total, max 60s |
| 3 | 70%-85% of episode | "Closing Thoughts" | 15% of total, max 60s |

Returns `400` if episode has no duration. Returns `409` if unprocessed (pending) highlights already exist for that episode.

### API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/episodes/:id/highlights` | Yes | List all highlights for episode |
| `POST` | `/api/episodes/:id/highlights/detect` | Yes | Run simulated detection, create pending clips |
| `PUT` | `/api/highlights/:id` | Yes | Update title, description, tags, start/end, status |
| `DELETE` | `/api/highlights/:id` | Yes | Delete highlight |
| `POST` | `/api/highlights/:id/approve` | Yes | Set status to 'approved' |

### Database

Existing `highlights` table is sufficient. Add one column:

```sql
ALTER TABLE highlights ADD COLUMN collection_id uuid REFERENCES collections(id) ON DELETE SET NULL;
```

This lets highlights be organized into collections without a junction table.

### Rich Editor UI

Collapsible "Highlight Clips" section below the episode metadata form:
- **Button bar**: "Auto-Detect Highlights" with loading state
- **Highlight cards**: Each renders as a bordered card with:
  - Editable title field
  - Time range inputs (start_seconds, end_seconds) with duration display
  - Description textarea
  - Tags input (comma-separated)
  - Status badge color-coded
  - Action buttons: Save changes, Approve (if pending), Reject/Delete
- **Empty state**: "No highlights yet. Click 'Auto-Detect' to generate suggestions."

### Collections Integration

Collections page gets a "Highlights" section when viewing a collection detail:
- Highlight cards with episode title link, time range, and status
- Modal/selector to add highlights from unassigned pool
- Remove button to unassign

## Data Flow

1. Editor opens episode in rich editor
2. Editor clicks "Auto-Detect Highlights"
3. Frontend calls `POST /api/episodes/:id/highlights/detect`
4. Server fetches episode duration, calculates 3 clips, inserts into `highlights` table
5. Server returns the 3 new highlights
6. Frontend renders them as cards
7. Editor adjusts times, adds description/tags, clicks Approve or Save
8. Each action calls the appropriate PUT/POST endpoint
9. Approved highlights appear in stats and can be assigned to collections

## Error Handling

- **Missing duration**: Detect returns 400 with "Episode duration required. Set duration in episode settings."
- **Existing pending highlights**: Detect returns 409. Frontend prompts editor to handle existing first.
- **Server errors**: All endpoints wrapped in try/catch, return 500 with `{ error: message }`
- **Frontend**: Toast notifications for success/failure on every operation

## Open Questions

None. Schema is ready, design covers all requirements.
