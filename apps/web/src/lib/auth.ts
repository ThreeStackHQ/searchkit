import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { db, users, workspaces } from '@searchkit/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(db as any),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? '',
      from: process.env.EMAIL_FROM ?? 'noreply@searchkit.app',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      if (user?.email) {
        try {
          const existing = await db
            .select({ id: users.id, workspaceId: users.workspaceId })
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

          if (existing.length > 0 && !existing[0].workspaceId) {
            const [ws] = await db
              .insert(workspaces)
              .values({ name: `${user.name ?? user.email}'s Workspace`, plan: 'free' })
              .returning();

            await db
              .update(users)
              .set({ workspaceId: ws.id })
              .where(eq(users.id, existing[0].id));
          }
        } catch {
          // DB may not be connected in build — ignore
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          const dbUser = await db
            .select({ id: users.id, workspaceId: users.workspaceId })
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);
          if (dbUser[0]) {
            token.userId = dbUser[0].id;
            token.workspaceId = dbUser[0].workspaceId;
          }
        } catch {
          // ignore
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as unknown as Record<string, unknown>).id = token.userId;
        (session as unknown as Record<string, unknown>).workspaceId = token.workspaceId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/login?verify=1',
  },
});
