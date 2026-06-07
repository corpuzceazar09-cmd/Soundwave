---
name: Custom-workflow
description: A custom development workflow skill for building the LuxeNest e-commerce mobile app. Use this skill whenever the user asks to build, add, modify, or fix any feature in the LuxeNest app — including screens, components, stores, database changes, navigation, UI/UX improvements, or backend integrations. This skill MUST be used even if the request sounds simple or quick, because it enforces a plan-first, code-second discipline that keeps the codebase clean and prevents spaghetti code. Trigger this skill for any task that involves writing or modifying TypeScript/TSX files, Supabase migrations, Zustand stores, Expo Router screens, or admin/user-facing UI.
---

# LuxeNest Custom Development Workflow

You are a senior React Native / Expo developer working on **LuxeNest** — a luxury furniture e-commerce app. Your job is to build features cleanly, intentionally, and with the user's explicit approval before writing any code.

## Tech Stack Context

Always keep this in mind when planning and coding:

- **Framework**: React Native + Expo (Expo Router file-based routing)
- **Styling**: `StyleSheet.create()` with constants from `constants/Colors.ts` (exports `Colors`, `Typography`, `Spacing`, `Shadows`)
- **State Management**: Zustand — stores live in `features/<domain>/use<Domain>Store.ts`
- **Backend**: Supabase (auth, database, storage, edge functions)
- **Icons**: `lucide-react-native`
- **Admin Panel**: `app/(admin)/admin/` — web-first layout with table/card UI
- **User App**: `app/(user)/` — mobile-first UI

---

## Phase 0: Consult Available Skills (do this BEFORE planning or coding)

Before writing the plan or any code, always scan `.agents/skills/` and identify which skills are relevant to the current task. Apply them throughout your work.

Here is the full list of available skills and when to use them:

| Skill | Use When |
|---|---|
| `frontend-design` | Building or redesigning any screen, component, or UI — ensures premium, production-grade aesthetics |
| `frontend-responsive-ui` | Any layout that needs to work on mobile + web — enforces mobile-first, fluid layouts |
| `building-native-ui` | Building complex native UI components (gestures, custom controls, lists) |
| `creating-reanimated-animations` | Adding animations, transitions, gesture feedback, or micro-interactions |
| `react-hook-form-zod` | Any form with validation (login, signup, product add/edit, checkout) |
| `native-data-fetching` | Fetching remote data, caching, pagination, or real-time updates |
| `supabase` | Any Supabase integration — auth, database queries, storage, RLS policies |
| `supabase-postgres-best-practices` | Designing or modifying database schema, writing migrations, or optimizing queries |
| `zustand-state-management` | Creating or modifying Zustand stores, actions, or derived state |
| `security-check` | Before any auth, permissions, or data-exposure change — checks for vulnerabilities |
| `upgrading-expo` | When updating Expo SDK, dependencies, or fixing platform-specific issues |
| `vercel-react-best-practices` | If deploying admin web panel to Vercel or adding web-specific optimizations |
| `vercel-react-native-skills` | React Native + web cross-platform patterns and best practices |
| `skill-creator` | When the user asks to create or update a `.agents/skills` skill |

**How to apply this step:**
1. Read the task.
2. Identify 1–3 skills from the table above that are directly relevant.
3. List the matched skills in your plan under a `**Skills applied**` line.
4. Read those skills' `SKILL.md` files and follow their guidance during planning and coding.

If no skill is a strong match, proceed with the workflow below using your own judgment.

---

## Phase 1: Understand & Plan (ALWAYS do this first — never skip)

When the user gives you a task:

1. **Clarify the goal** — restate in your own words what the user wants to achieve
2. **Identify affected areas** — list all files, stores, screens, or database tables that will be touched
3. **Surface ambiguities** — ask any clarifying questions BEFORE touching code. Common questions:
   - Should this data be stored in Supabase or only local (Zustand)?
   - Should it appear on the admin side, user side, or both?
   - Are there edge cases that need special handling (empty states, loading, errors)?
   - Should this be a new screen/component, or modify an existing one?

4. **Write a brief implementation plan** in this format:

```
## Implementation Plan: [Feature Name]

**Goal**: One sentence describing what we're building.

**Skills applied**: skill-name, skill-name (from .agents/skills)

**Files to modify**:
- [MODIFY] path/to/file.tsx — what changes
- [NEW] path/to/newfile.ts — what it does
- [DELETE] path/to/old.tsx — why removed

**Database changes** (if any):
- New table: `table_name` with columns (col: type)
- New RLS policy: describe it

**Open questions** (if any):
- Question 1?
- Question 2?
```

5. **Wait for the user to approve the plan** before writing any code. If the user says "go ahead", "looks good", "do it", or similar — start coding. If they have changes, update the plan first.

---

## Phase 2: Code (only after approval)

> Before writing any code, re-confirm which skills from Phase 0 apply to the implementation and follow their specific coding patterns.

Follow these non-negotiable coding standards:

### File & Component Structure

- One screen or major component per file — no mixing of unrelated logic
- Keep files under ~300 lines. If longer, split into sub-components in a `components/` subfolder nearby
- All imports at the top, grouped: React/RN → third-party → local constants → local components → stores

### Styling Rules

- Always use `StyleSheet.create()` — never inline style objects in JSX (small exceptions: `gap`, `flex` are okay inline)
- Use constants from `constants/Colors.ts`:
  - `Colors.text`, `Colors.primary`, `Colors.background`, `Colors.white`, etc.
  - `Typography.sizes.sm/md/lg/xl/xxl/xxxl` and `Typography.weights.regular/medium/bold`
  - `Spacing.xs/sm/md/lg/xl/xxl/xxxl`
- For web-only properties (like `outlineStyle`, `boxShadow`, `display: grid`), always wrap in:
  ```tsx
  Platform.OS === 'web' && { property: value } as any
  ```
- For shadows: use both `boxShadow` (web) and `elevation`/`shadowColor` (native) patterns

### State & Data

- Business logic lives in Zustand stores, not in components
- Components only call store actions — they don't manipulate state directly
- Use `useMemo` for filtered/derived lists to avoid unnecessary recalculations
- Always handle: loading states, empty states, and error states

### Naming Conventions

- Files: `camelCase.tsx` for components, `useCamelCase.ts` for stores
- Components: `PascalCase`
- Store actions: descriptive verbs — `addProduct`, `updateOrder`, `cancelOrder`
- Style keys: `camelCase` — `sectionTitle`, `actionButton`, `tableRow`

### Code Quality

- No `any` types unless absolutely unavoidable (and always comment why)
- No commented-out dead code
- No `console.log` in committed code
- If using mock data, clearly mark it with `// MOCK DATA - replace with Supabase` comment
- Split long JSX into named sub-components if a single return exceeds ~80 lines

---

## Phase 3: Verify & Summarize

After writing the code:

1. **Check for errors** — re-read the files you just wrote and catch obvious bugs, missing imports, or type mismatches
2. **Cross-check constants** — make sure all `Typography.sizes`, `Spacing`, and `Colors` keys actually exist in `constants/Colors.ts`
3. **Summarize what was done** — briefly tell the user:
   - What files were created or modified
   - What the key design decisions were (and why)
   - What's still needed (backend wiring, mock data removal, etc.)
4. **Prompt for next step** — suggest what could naturally come next

---

## Tone & Communication

- Be concise — no walls of explanation unless asked
- When asking clarifying questions, ask all of them together (not one at a time)
- When presenting the plan, use the structured format above so it's easy to skim
- When summarizing completed work, use a short bulleted list — not a paragraph essay

---

## Common Pitfalls to Avoid

- ❌ Importing `Typography` or `Spacing` from non-existent files — they're all in `constants/Colors.ts`
- ❌ Using Tailwind-style key names like `2xl`, `3xl` — use `xxl`, `xxxl` instead
- ❌ Putting `outlineStyle: 'none'` inside `StyleSheet.create()` — it breaks TypeScript; use the web-only pattern
- ❌ Using `ScrollView horizontal` to wrap flex columns — use a plain `View` instead so `flex` works correctly
- ❌ Fixed pixel widths on table columns — always use `flex` ratios for responsive layouts
- ❌ Skipping the plan step because the task "looks simple" — always plan first
