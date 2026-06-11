# Editor Framework Swap: Express.js → Fastify

**Date:** 2026-06-11
**Status:** Draft
**Phase:** 1 of 7

## Problem Statement

The Soundwave project requires three subsystems (Admin, Editor, Public User) to use **different frameworks**. Currently all three use Express.js. The Editor system also needs structural refactoring — its entire server logic lives in a single 876-line `server.js` file with inline routes, duplicated middleware patterns, and no modular organization.

## Constraints

- All existing HTML templates, CSS, and client-side JS must work without changes
- All API endpoints must retain the same request/response shapes
- Supabase and MongoDB data access patterns stay the same
- Editor must still run on port 8080
- Client-side `auth.js` uses `fetch()` against the same endpoints — must not break
- MongoDB models stay in `models/` (unchanged)

## Approach

**Big Bang Rewrite** — Rewrite the entire `server.js` into a modular Fastify project structure, then delete the old Express file.

Why this approach:
- The Express→Fastify translation is mechanical — same business logic, different API signatures
- The 876-line file needs decomposition regardless of framework
- No complex state to migrate incrementally
- Clean Fastify-native codebase from day one

## Architecture

### File Structure

```
Editor/
├── app.js              # Fastify instance + plugin registration
├── server.js           # Entry point (imports app, starts listening)
├── plugins/
│   ├── auth.js         # JWT verify + decorator (replaces authMiddleware)
│   ├── supabase.js     # Supabase client as fastify decorator
│   └── mongoose.js     # MongoDB connection plugin
├── routes/
│   ├── auth.js         # POST /api/login, GET /api/me
│   ├── stats.js        # GET /api/stats
│   ├── episodes.js     # GET/PUT /api/episodes
│   ├── collections.js  # GET /api/collections
│   ├── categories.js   # GET /api/categories
│   ├── editors.js      # GET /api/editors
│   ├── editorial.js    # Editorial MongoDB routes (stats, status, publish, delete)
│   └── podcasts.js     # GET/PUT /api/editor/podcasts, feature/unfeature
├── models/
│   ├── EditorialAction.js   # (unchanged)
│   └── PodcastEdit.js       # (unchanged)
├── *.html              # (unchanged — served as static files)
├── auth.js             # (unchanged — client-side JS)
├── styles.css          # (unchanged)
└── package.json        # Updated dependencies
```

### Middleware Migration

| Express | Fastify |
|---------|---------|
| `helmet()` | `@fastify/helmet` |
| `rateLimit()` | `@fastify/rate-limit` |
| `cors()` | `@fastify/cors` |
| `express.json()` | Built-in (Fastify auto-parses JSON) |
| `express.static()` | `@fastify/static` |
| `express-validator` | JSON Schema (route-level `schema` option) |
| JWT `authMiddleware` fn | `@fastify/jwt` with `preHandler` hook |
| Error handler `(err, req, res, next)` | `setErrorHandler()` |
| `requireEditor` for HTML pages | `onRequest` hook on static route prefix |

## Components

### 1. `app.js` — Fastify Instance
- Creates Fastify instance with `logger: true`
- Registers all plugins: helmet, rate-limit, cors, static, jwt, supabase, mongoose
- Registers all route modules sequentially
- Sets error handler
- Sets wildcard 404 handler

### 2. `plugins/auth.js` — JWT Authentication
- Registers `@fastify/jwt` with `JWT_SECRET`
- Decorates fastify with `authenticate` preHandler
- Authenticate hook: calls `request.jwtVerify()`, sets `request.user`

### 3. `plugins/supabase.js` — Supabase Client
- Creates Supabase client from env vars
- Decorates fastify with `supabase` property
- Each route accesses via `request.supabase` (or `fastify.supabase`)

### 4. `plugins/mongoose.js` — MongoDB Connection
- Connects Mongoose to `MONGODB_URI` on server start
- **Currently optional** (logs warning if unset) — will become required in Phase 2
- After connection, imports models from `models/`

### 5. Route Modules
Each route file exports a function that takes `(fastify, opts, done)`:
- Registers routes via `fastify.get()`, `fastify.put()`, `fastify.post()`, `fastify.delete()`
- Uses `{ preHandler: [fastify.authenticate] }` for protected routes
- Optionally uses `schema` for request validation
- Business logic is copy-pasted from Express version (unchanged)

### 6. Static File Serving
- `@fastify/static` serves `Editor/` directory at root path `/`
- An `onRequest` hook handles the HTML auth check (replaces `requireEditor` middleware)
- Clean URL mappings: `/dashboard` → `/dashboard.html`, etc.

## Route Translation

```
Express:                          Fastify:
req.params.id               →    request.params.id
req.query.page              →    request.query.page
req.body.status             →    request.body.status
req.editor                  →    request.user (set by @fastify/jwt)
res.json(data)              →    return data
res.status(401).json(...)   →    reply.code(401).send(...)
next()                      →    (function end)
```

**Example:**

```js
// Express
app.get('/api/stats', authMiddleware, async (req, res) => {
  const { count } = await supabase.from('podcasts').select('id', { count: 'exact', head: true });
  res.json({ totalPodcasts: count ?? 0 });
});

// Fastify
fastify.get('/api/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  const { count } = await request.supabase.from('podcasts').select('id', { count: 'exact', head: true });
  return { totalPodcasts: count ?? 0 };
});
```

## Data Flow

No change to data flow:

```
Browser → HTTP → Fastify → @fastify/jwt verify → route handler → Supabase/MongoDB → response
```

- **Supabase**: Shared via decorator, accessible as `request.supabase`
- **MongoDB**: Standard Mongoose models, same as before
- **Auth**: Login uses Supabase Auth, returns JWT. All API routes verify JWT via `@fastify/jwt`
- **Static HTML**: Served via `@fastify/static`. Client-side `auth.js` attaches Bearer token to fetch() calls

## Error Handling

```js
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(error.statusCode || 500).send({ error: 'Internal server error' });
});
```

- **Validation errors**: Handled automatically by Fastify's schema validation (returns 400)
- **Auth errors**: Caught by `authenticate` hook, returns 401
- **Route errors**: Caught by try/catch in handler, returns 500
- **404**: Wildcard route at end of route registration

## Key Differences from Express

1. **Return values**: Fastify auto-serializes returned objects — `return { data }` is equivalent to `res.json(data)`
2. **Async by default**: Fastify handlers support async/await natively, no need for try-catch wrappers unless you need custom error messages
3. **Schema validation**: Declarative JSON Schema per route, replaced `express-validator` checks
4. **Plugin lifecycle**: Plugins are registered in order, `done` callback for async plugin init
5. **Logging**: Built-in pino logger — `request.log.info()`, `request.log.error()`

## Dependencies

### Remove
- `express` 
- `cors` (replaced by `@fastify/cors`)
- `helmet` (replaced by `@fastify/helmet`)
- `express-rate-limit` (replaced by `@fastify/rate-limit`)
- `express-validator` (replaced by JSON Schema built-in)

### Add
- `fastify` (core framework)
- `@fastify/helmet` (security headers)
- `@fastify/rate-limit` (rate limiting)
- `@fastify/cors` (CORS)
- `@fastify/static` (static file serving)
- `@fastify/jwt` (JWT verification + signing)

### Keep
- `@supabase/supabase-js`
- `dotenv`
- `mongoose`
- (all remaining existing deps)
- (all remaining existing deps)

## Testing Strategy

1. **Start both servers**: Old Express on port 8081, new Fastify on port 8080
2. **API contract tests**: curl each endpoint comparing status code + body structure
3. **Auth flow**: Full login → use token → access protected routes → expired token rejection
4. **HTML page load**: Verify each clean URL serves the correct HTML page
5. **Static assets**: Verify CSS loads, auth.js runs, images display
6. **MongoDB operations**: Create editorial action, verify it persists
7. **Smoke test**: Manual walkthrough of the full Editor UI

## Open Questions

- None at this stage. The migration is a mechanical translation of known working code.

## Next Steps

After approval and implementation:
1. Start Phase 2: Editor MongoDB → Required
2. Then Phase 3: AI Highlight Feature
