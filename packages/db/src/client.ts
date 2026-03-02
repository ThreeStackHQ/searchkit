import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type DbType = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbType | null = null;

export function getDb(): DbType {
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL ?? 'postgresql://localhost/searchkit');
    _db = drizzle(client, { schema });
  }
  return _db;
}

// Lazy db singleton — won't connect until first query
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: DbType = new Proxy({} as DbType, {
  get(_target, prop: string | symbol) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop as string];
  },
}) as DbType;
