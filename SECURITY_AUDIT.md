# SearchKit — Security Audit Report

**Sprint:** [3.4] Security Audit  
**Date:** 2026-03-02  
**Auditor:** Sage  
**Scope:** Existing scaffold + Wren's UI code (Bolt's API backend pending — see PENDING section)

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 13 |
| 🔧 FIXED | 4 |
| ⏳ PENDING (awaiting Bolt's backend) | 6 |

---

## Security Headers

| Check | Status | Notes |
|-------|--------|-------|
| X-Content-Type-Options: nosniff | ✅ PASS | Present |
| X-Frame-Options: DENY | ✅ PASS | Present |
| Referrer-Policy: strict-origin-when-cross-origin | ✅ PASS | Present |
| HSTS: max-age=31536000; includeSubDomains | ✅ PASS | Present |
| Permissions-Policy (camera/mic/geo) | ✅ PASS | Present |
| CSP: base-uri 'self' | 🔧 FIXED | Added — prevents base tag injection |
| CSP: form-action 'self' | 🔧 FIXED | Added — prevents form action hijacking |
| CSP: object-src 'none' | 🔧 FIXED | Added — blocks Flash/plugin exploits |
| CSP: frame-ancestors 'none' | 🔧 FIXED | Added — belt+suspenders with X-Frame-Options |
| CSP: upgrade-insecure-requests | 🔧 FIXED | Added — forces HTTPS for sub-resources |
| X-XSS-Protection removed | 🔧 FIXED | Was deprecated in Chrome 78+, removed |

**Note:** CSP retains `unsafe-inline` for script-src and style-src — required by Next.js App Router.
Nonce-based CSP is tracked as future hardening (post-MVP).

---

## JS Widget (packages/widget/src/widget.ts)

| Check | Status | Notes |
|-------|--------|-------|
| escapeHtml() covers all 5 chars (&, <, >, ", ') | ✅ PASS | Correct implementation |
| innerHTML with raw user data | ✅ PASS | `resultsList.innerHTML = ''` clears only |
| Result rendering uses textContent | ✅ PASS | title and snippet use .textContent |
| API key placement (header, not URL) | ✅ PASS | Authorization Bearer header |
| URL params via URLSearchParams (auto-encoded) | ✅ PASS | q and index params are safe |
| noopener,noreferrer on window.open | ✅ PASS | Present |
| URL protocol validation (javascript: injection) | 🔧 FIXED | isSafeUrl() validates http/https only |

---

## Database Schema (packages/db/src/index.ts)

| Check | Status | Notes |
|-------|--------|-------|
| UUID primary keys (prevents enumeration) | ✅ PASS | All PKs are uuid().primaryKey() |
| Foreign key constraints | ✅ PASS | Proper .references() with cascade |
| keyHash stored (not raw API keys) | ✅ PASS | No raw keys in DB |
| ipHash in search_logs (privacy) | ✅ PASS | IP addresses are hashed |
| Unique constraint on apiKeys.keyHash | ✅ PASS | Present |

---

## Auth & Middleware

| Check | Status | Notes |
|-------|--------|-------|
| /dashboard/* protected | ✅ PASS | NextAuth middleware covers it |
| /api/v1/* protected | ✅ PASS | Middleware matcher includes it |
| NextAuth v5 used | ✅ PASS | Correct version |

---

## Environment Validation

| Check | Status | Notes |
|-------|--------|-------|
| 8 required env vars validated | ✅ PASS | DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_*, STRIPE_*, RESEND_*, REDIS_URL |
| env.ts imported on startup | 🔧 FIXED | Added `import '@/lib/env'` to layout.tsx |

---

## PENDING — Awaiting Bolt's Backend Code

These checks **cannot be performed** until Bolt's Wave 22 backend is committed (`feat/bolt-backend`):

| Check | Reason |
|-------|--------|
| IDOR: workspace isolation on /api/v1/* | Need to audit workspace ownership checks in API handlers |
| API key brute force / rate limiting | Need to see rate limiting middleware on /api/v1/* |
| SQL injection via tsvector | Need to audit FTS query construction (Drizzle parameterized?) |
| Stripe webhook signature verification | Need to see webhook handler (should use `stripe.webhooks.constructEvent`) |
| Rate limiting on signup/auth | Need to see auth route handlers |
| tsvector injection via crafted queries | Need to see search query handler |

**Action:** Sage will complete this audit in Sprint 3.4b once Bolt's backend lands.

---

## Fixes Applied

```
commit: security(audit): Sprint 3.4 — CSP hardening, URL validation, env import fix

Files changed:
- apps/web/next.config.mjs: Add base-uri, form-action, object-src, frame-ancestors, upgrade-insecure-requests; remove deprecated X-XSS-Protection
- packages/widget/src/widget.ts: Add isSafeUrl() protocol validation on window.open
- apps/web/src/app/layout.tsx: Import @/lib/env for startup env validation
```
