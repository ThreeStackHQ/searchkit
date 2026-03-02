// Environment variable validation
// In production, all required vars must be set
// During build, we skip validation

const isProduction = process.env.NODE_ENV === 'production' && !process.env.SKIP_ENV_CHECK;

const required = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
];

if (isProduction) {
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'dev-secret',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  REDIS_URL: process.env.REDIS_URL,
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  STRIPE_PRICE_INDIE: process.env.STRIPE_PRICE_INDIE ?? '',
  STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'noreply@searchkit.app',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
};
