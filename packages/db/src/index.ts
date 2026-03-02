import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  customType,
} from 'drizzle-orm/pg-core';

// Custom tsvector type
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

// --- Tables ---

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const indexes = pgTable('indexes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  documentCount: integer('document_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    indexId: uuid('index_id')
      .notNull()
      .references(() => indexes.id, { onDelete: 'cascade' }),
    docId: text('doc_id').notNull(),
    content: jsonb('content').notNull(),
    tsv: tsvector('tsvector'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqIndexDoc: unique().on(t.indexId, t.docId),
  })
);

export const searchLogs = pgTable('search_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  indexId: uuid('index_id')
    .notNull()
    .references(() => indexes.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  resultsCount: integer('results_count').notNull(),
  responseMs: integer('response_ms').notNull(),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: jsonb('events').notNull(),
  secret: text('secret').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .unique(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  plan: text('plan').notNull(),
  status: text('status').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- DB Connection ---

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);
