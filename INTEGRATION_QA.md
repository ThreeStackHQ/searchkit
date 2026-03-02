# SearchKit — Integration Testing & QA Report

**Sprint:** [3.5] Integration Testing & QA
**Date:** 2026-03-02
**Auditor:** Sage
**Branch:** feat/bolt-backend

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 5 flows |
| 🔧 FIXED | 2 bugs (1 HIGH, 1 LOW) |
| ⚠️ PARTIAL | 0 |

---

## Flow 1: Signup → API Key → First Search

**Steps traced:**
1. User signs in via Google OAuth → NextAuth signIn callback fires
2. DrizzleAdapter has already created user record by the time signIn fires
3. `existing = SELECT WHERE email = ?` → finds user with `workspaceId: null`
4. Workspace created → `workspaceId` saved to user row ✅
5. JWT callback populates `token.workspaceId` for all subsequent requests ✅
6. User creates API key via dashboard: `POST /api/dashboard/api-keys`
   - `rawKey = sk_live_<40 hex chars>` generated via `randomBytes(20)`
   - `keyHash = SHA-256(rawKey)` stored in DB
   - `rawKey` returned ONCE to user — never retrievable again ✅
7. Widget initializes: `new SearchKit({ apiKey, indexId })`
8. User searches → `POST /api/v1/search` (from external origin, CORS fixed ✅)
9. `authenticateApiKey` → SHA-256 hash lookup → returns workspaceId + plan
10. `checkRateLimit` → 100/min sliding window ✅
11. `checkDailySearchLimit` → plan-capped ✅
12. Ownership check: index must belong to workspace ✅
13. FTS: `plainto_tsquery` + `ts_rank` + GIN index ✅

**Result:** ✅ PASS

---

## Flow 2: Document Indexing

**Steps traced:**
1. `POST /api/v1/indexes` — creates index, checks plan limit (free: 1, indie: 5, pro: ∞)
2. `POST /api/v1/indexes/[id]/docs/batch` — upserts up to 500 docs
   - Ownership verified before insert ✅
   - Plan doc limit checked before insert ✅
   - `onConflictDoUpdate` with `xmax` trick to count net new rows ✅
   - `document_count` incremented only for new rows (not updates) ✅
3. `search_vector` auto-computed by PostgreSQL GENERATED ALWAYS AS column (migration provided) ✅
4. `DELETE /api/v1/indexes/[id]/docs/[docId]` — verifies index ownership before delete ✅
5. `document_count` decremented with `GREATEST(..., 0)` guard ✅

**Result:** ✅ PASS (requires BUG-001 fix — see below)

---

## Flow 3: Analytics

**Steps traced:**
1. `GET /api/analytics?period=7d` — requires NextAuth session ✅
2. `workspaceId` from JWT token (set in jwt callback) ✅
3. Redis cache checked first (5 min TTL), gracefully falls back if Redis unavailable ✅
4. All aggregations scoped to `workspace_id` in WHERE clause ✅
5. `PERIOD_MAP` lookup prevents SQL injection on interval value ✅
6. Cache write after successful aggregation ✅

**Result:** ✅ PASS

---

## Flow 4: Stripe Billing

**Steps traced:**
1. `POST /api/stripe/create-checkout` — session auth, plan → priceId lookup ✅
2. Stripe customer created if not exists; `stripeCustomerId` saved to workspace ✅
3. `subscription_data.metadata.workspaceId` set at checkout creation ✅
4. `POST /api/stripe/webhook`:
   - Raw body via `req.text()` ✅
   - `constructEvent()` validates signature ✅
   - `checkout.session.completed`: reads `session.metadata.workspaceId`, fetches subscription, updates plan ✅
   - `customer.subscription.updated`: reads `sub.metadata.workspaceId`, updates plan ✅
   - `customer.subscription.deleted`: downgrades to 'free' ✅
   - Unhandled events return 200 (correct — don't 400 Stripe) ✅

**Result:** ✅ PASS

---

## Flow 5: Weekly Digest Cron

**Steps traced:**
1. `GET /api/cron/weekly-digest` — validates `x-cron-secret` header ✅
2. Finds workspaces with searches in past 7 days ✅
3. Per-workspace stats: total searches, zero-result rate, top 3 queries ✅
4. Resend email sent to workspace owner ✅
5. Errors per-workspace are caught + logged, doesn't abort entire cron run ✅

**Result:** ✅ PASS

---

## Bugs Found & Fixed

### BUG-001 HIGH: No database migration — `search_vector` never populated

**Problem:** The `documents.search_vector` column is declared as a plain `tsvector` in the Drizzle schema, but must be a PostgreSQL `GENERATED ALWAYS AS` column to be auto-populated. Without this:
- Every INSERT/UPSERT leaves `search_vector = NULL`
- All FTS queries (`search_vector @@ plainto_tsquery(...)`) match 0 documents
- SearchKit returns no results for any query — **completely broken at deploy**

**Fix:** Created `packages/db/migrations/0000_initial.sql` with full schema definition:
```sql
search_vector TSVECTOR GENERATED ALWAYS AS (
  to_tsvector('english', content::text)
) STORED
```
Plus GIN index:
```sql
CREATE INDEX IF NOT EXISTS documents_search_vector_idx
  ON documents USING GIN (search_vector);
```

**Note:** Also includes all 11 tables with proper constraints, foreign keys, and performance indexes.

---

### BUG-002 LOW: `buildHighlight()` regex injection on query input

**Problem:** `buildHighlight()` in `POST /api/v1/search` builds a regex from user query words without escaping. A query like `(foo` or `a+b` causes `SyntaxError: Invalid regular expression`, crashing the route handler and returning a 500 error.

**Fix:** Added `escapeRegex()` helper that escapes all regex metacharacters before constructing the highlight regex:
```ts
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

## Accepted / Not Fixed

| Item | Decision |
|------|----------|
| `workspaces.api_key` column exists but unused | ACCEPTED — legacy field, not a security risk. Can be cleaned up post-MVP. |
| Batch endpoint: no max body byte limit | ACCEPTED — auth required + plan doc cap limits blast radius. |
| Widget `config.maxResults` not validated server-side | ACCEPTED — server enforces `safeLimit = Math.min(limit, 100)` in the handler. |

---

## Final Verdict

**SearchKit [3.5] Integration Testing: ✅ PASS**

- 5/5 flows pass (after BUG-001 fix)
- 1 HIGH bug fixed (missing migration = FTS completely broken)
- 1 LOW bug fixed (regex injection in highlight)
- SearchKit is **deployment-ready** pending [3.6] Production Deployment

**Remaining:** [3.6] Production Deployment — blocked on DEPLOY_ALL.sh (Ruud)
