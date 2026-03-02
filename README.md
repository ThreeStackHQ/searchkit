# SearchKit

Search-as-a-Service for indie SaaS — Algolia, but $9/mo.

Drop-in search API + 5KB JS widget powered by PostgreSQL full-text search.

## Stack
- Next.js 14 + TypeScript + PostgreSQL + Drizzle ORM
- Vanilla JS Widget (<5KB, CDN-hosted)
- Redis (rate limiting), BullMQ (weekly digest)
- Stripe, Resend, NextAuth v5

## Pricing
- Free: 1 index, 10K docs, 1K searches/day
- Indie: $9/mo — 5 indexes, 100K docs, 50K searches/day
- Pro: $19/mo — Unlimited

## Quick Start
```bash
pnpm install
pnpm dev
```
