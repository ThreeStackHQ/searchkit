const required = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'REDIS_URL',
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}
