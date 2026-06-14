# Security Hardening Implementation Plan

> **For agentic workers:** REQ SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add input validation to PublicUser API + lock down CORS on Editor and PublicUser

**Architecture:** Middleware-only changes — no route handler logic changes. Add `express-validator` validation chains and replace wide-open `cors()` with origin-specific configs.

**Tech Stack:** Express, express-validator (already in Editor, needs install in PublicUser), cors

---

### Task 1: Add express-validator dependency to PublicUser

**Files:**
- Modify: `PublicUser/package.json`
- Modify: `PublicUser/server.js`

- [ ] **Step 1: Add express-validator to package.json dependencies**

Edit `PublicUser/package.json`: add `"express-validator": "^7.0.1"` after `"express-rate-limit"` line

- [ ] **Step 2: Install the dependency**

Run: `cd PublicUser && npm install`

---

### Task 2: Add validation middleware to PublicUser

**Files:**
- Modify: `PublicUser/server.js` (import + validate middleware)

- [ ] **Step 3: Add import at line 6**

After line 5 (`const jwt = require('jsonwebtoken');`), add:
```
const { body, query, validationResult } = require('express-validator');
```

- [ ] **Step 4: Add validate middleware function after authMiddleware**

After the `authMiddleware` function (after line 139), add:
```
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
}
```

---

### Task 3: Add validation chains to PublicUser auth routes

**Files:**
- Modify: `PublicUser/server.js`

- [ ] **Step 5: Validate POST /api/auth/signup**

Change the route at line 146 from:
```
app.post('/api/auth/signup', async (req, res) => {
```
to:
```
app.post('/api/auth/signup',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
  async (req, res) => {
```
Remove the manual validation at lines 149-154 (`if (!name || !email || !password)`, `if (password.length < 6)`).

- [ ] **Step 6: Validate POST /api/auth/login**

Change the route at line 197 from:
```
app.post('/api/auth/login', async (req, res) => {
```
to:
```
app.post('/api/auth/login',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
  async (req, res) => {
```
Remove the manual validation at lines 200-202 (`if (!email || !password)`).

- [ ] **Step 7: Validate POST /api/ratings**

Change the auth-protected route at line 469. Add validation after `authMiddleware`:
```
app.post('/api/ratings', authMiddleware,
  body('podcast_id').notEmpty().withMessage('podcast_id is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  validate,
  async (req, res) => {
```
Remove the manual check at lines 473-475 (`if (!podcast_id || !rating)`).

- [ ] **Step 8: Validate POST /api/follows**

Change the auth-protected route at line 509:
```
app.post('/api/follows', authMiddleware,
  body('podcast_id').notEmpty().withMessage('podcast_id is required'),
  body('follow').isBoolean().withMessage('follow must be true or false'),
  validate,
  async (req, res) => {
```
Remove the manual check at lines 513-515 (`if (!podcast_id)`).

- [ ] **Step 9: Validate POST /api/activity**

Change the auth-protected route at line 554:
```
app.post('/api/activity', authMiddleware,
  body('action').isIn(['played', 'paused', 'completed', 'skipped']).withMessage('Invalid action'),
  body('episode_id').optional().notEmpty(),
  body('podcast_id').optional().notEmpty(),
  body('listened_seconds').optional().isInt({ min: 0 }),
  validate,
  async (req, res) => {
```
Remove the manual check at lines 558-560 (`if (!action)`).

- [ ] **Step 10: Validate PUT /api/profile**

Change the auth-protected route at line 608:
```
app.put('/api/profile', authMiddleware,
  body('display_name').optional().trim().isLength({ min: 1, max: 100 }),
  body('avatar_url').optional().isURL(),
  validate,
  async (req, res) => {
```

---

### Task 4: Lock down CORS

**Files:**
- Modify: `PublicUser/server.js` (line 117)
- Modify: `Editor/server.js` (line 75)

- [ ] **Step 11: Fix PublicUser CORS**

Change line 117 from:
```
app.use(cors());
```
to:
```
app.use(cors({ origin: 'http://localhost:8082', credentials: true }));
```

- [ ] **Step 12: Fix Editor CORS**

In `Editor/server.js`, change line 75 from:
```
app.use(cors());
```
to:
```
app.use(cors({ origin: 'http://localhost:8081', credentials: true }));
```

---

### Task 5: Test the changes

- [ ] **Step 13: Verify server starts**

Run: `cd PublicUser && node server.js` — should start without errors

Run: `cd Editor && node server.js` — should start without errors

- [ ] **Step 14: Verify validation returns errors**

Test signup with bad email: `curl -X POST http://localhost:8082/api/auth/signup -H "Content-Type: application/json" -d '{"email":"bad","password":"123"}'` → expect 400 with errors array

Test rating out of range: `curl -X POST http://localhost:8082/api/ratings -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN" -d '{"podcast_id":"abc","rating":99}'` → expect 400
