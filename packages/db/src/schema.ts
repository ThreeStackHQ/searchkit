import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  varchar,
  customType,
} from 'drizzle-orm/pg-core';

// Custom tsvector type for PostgreSQL full-text search
export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

// Plan enum
export const planEnum = pgEnum('plan', ['free', 'indie', 'pro']);

// --- Core Tables ---

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  plan: planEnum('plan').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  apiKey: text('api_key').unique(), // raw key for lookup
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyPrefix: varchar('key_prefix', { length: 8 }),
  keyHash: text('key_hash').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
});

export const searchIndexes = pgTable(
  'indexes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    documentCount: integer('document_count').notNull().default(0),
    tsvectorConfig: text('tsvector_config').notNull().default('english'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqueNamePerWorkspace: unique().on(t.workspaceId, t.name),
  })
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    indexId: uuid('index_id')
      .notNull()
      .references(() => searchIndexes.id, { onDelete: 'cascade' }),
    docId: text('doc_id').notNull(),
    content: jsonb('content').notNull(),
    // NOTE: search_vector is a GENERATED column in PostgreSQL.
    // We declare it here for query purposes, but it's managed by the DB.
    searchVector: tsvector('search_vector'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqIndexDoc: unique().on(t.indexId, t.docId),
    // GIN index on search_vector: CREATE INDEX documents_search_vector_idx ON documents USING gin(search_vector);
    // Add via migration manually for PostgreSQL full-text search performance
  })
);

export const searchLogs = pgTable('search_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  indexId: uuid('index_id').references(() => searchIndexes.id, { onDelete: 'set null' }),
  query: text('query').notNull(),
  resultsCount: integer('results_count').notNull().default(0),
  responseMs: integer('response_ms').notNull().default(0),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .unique(),
  stripeSubId: text('stripe_sub_id'),
  stripePriceId: text('stripe_price_id'),
  plan: planEnum('plan').notNull().default('free'),
  status: text('status').notNull().default('active'),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// --- NextAuth Tables ---

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({
    compoundKey: unique().on(t.provider, t.providerAccountId),
  })
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => ({
    compoundKey: unique().on(t.identifier, t.token),
  })
);

// Type exports
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type SearchIndex = typeof searchIndexes.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type SearchLog = typeof searchLogs.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type User = typeof users.$inferSelect;
