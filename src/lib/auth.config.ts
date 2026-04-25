import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.department = user.department
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.department = token.department as string
            }
            return session
        }
    },
    session: {
        strategy: "jwt"
    },
    providers: [] // Providers are configured in auth.ts
} satisfies NextAuthConfig
