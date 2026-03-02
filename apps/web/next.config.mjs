/** @type {import('next').NextConfig} */
const config = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        // X-XSS-Protection removed: deprecated in Chrome 78+, can cause issues
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            // unsafe-inline needed for Next.js App Router (inline styles/scripts)
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self' https://api.stripe.com",
            // Security hardening directives
            "base-uri 'self'",          // prevents base tag injection
            "form-action 'self'",       // prevents form action hijacking
            "object-src 'none'",        // blocks Flash/plugin exploits
            "frame-ancestors 'none'",   // CSP belt+suspenders with X-Frame-Options
            "upgrade-insecure-requests", // forces HTTPS for sub-resources
          ].join('; '),
        },
      ],
    },
  ],
};

export default config;
