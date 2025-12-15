import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const client = await pool.connect();
        try {
          const res = await client.query(
            `SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1`,
            [credentials.email]
          );
          const user = res.rows[0];
          if (!user) return null;
          const ok = await bcrypt.compare(credentials.password, user.password_hash || "");
          if (!ok) return null;
          return { id: String(user.id), email: user.email };
        } finally {
          client.release();
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.user = user;
      return token;
    },
    async session({ session, token }) {
      if (token && (token as any).user) session.user = (token as any).user;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
