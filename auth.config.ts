// Edge-safe Auth.js config (no DB adapter here) — used by middleware and merged
// into the full config in auth.ts. Domain gate lives in the signIn callback.
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export const SUFFIX_DOMAIN = "suffix.works";

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [
    Google({
      authorization: {
        params: { hd: SUFFIX_DOMAIN, prompt: "select_account" },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    // The real domain gate: block sign-in for anyone outside @suffix.works.
    signIn({ profile }) {
      const email = (profile?.email ?? "").toLowerCase();
      return email.endsWith("@" + SUFFIX_DOMAIN);
    },
    // Protect matched routes (see middleware.ts matcher).
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
