import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { canSignInWithGoogle } from "@/lib/auth-policy";

export const authConfigured = Boolean(
  process.env.AUTH_SECRET &&
    process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      return canSignInWithGoogle(profile);
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
