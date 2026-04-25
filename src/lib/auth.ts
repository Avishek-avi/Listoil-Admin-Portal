import NextAuth, { CredentialsSignin } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "../db"
import { users, userTypeEntity, userTypeLevelMaster } from "../db/schema"
import { eq, or } from "drizzle-orm"
import bcrypt from 'bcryptjs'
import { authConfig } from "./auth.config"

const SALT_ROUNDS = 10;

class InvalidCredentials extends CredentialsSignin {
  code = "Invalid Credentials"
}

class AccessDenied extends CredentialsSignin {
  code = "Access Denied"
}

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns True if passwords match, false otherwise
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new InvalidCredentials()
        }

        const username = credentials.username as string
        const password = credentials.password as string

        try {
          const userResult = await db
            .select({
              user: users,
              role: userTypeEntity.typeName,
              levelName: userTypeLevelMaster.levelName
            })
            .from(users)
            .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
            .leftJoin(userTypeLevelMaster, eq(userTypeEntity.levelId, userTypeLevelMaster.id))
            .where(or(eq(users.email, username), eq(users.phone, username)))
            .limit(1)

          console.log(userResult)

          if (userResult.length === 0) {
            throw new InvalidCredentials()
          }

          const { user, role, levelName } = userResult[0]

          const allowedLevels = ['Master Admin', 'Admin', 'System Admin', 'Call Centre']

          if (!levelName || !allowedLevels.includes(levelName)) {
            console.log(`Login attempt rejected for user ${username}: Invalid level ${levelName}`)
            throw new AccessDenied()
          }

          if (!user.password) {
            throw new InvalidCredentials()
          }

          const isPasswordValid = await comparePassword(password, user.password)

          if (!isPasswordValid) {
            throw new InvalidCredentials()
          }

          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role: role || 'user',
            department: 'IT' // Defaulting to IT
          }
        } catch (error) {
          if (error instanceof CredentialsSignin) {
            throw error
          }
          console.error("Auth error:", error)
          throw new InvalidCredentials()
        }
      }
    })
  ],
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
      if (token) {
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
  events: {
    async signIn({ user }) {
      try {
        const { emitEvent, BUS_EVENTS } = await import("@/server/rabbitMq/broker");
        await emitEvent(BUS_EVENTS.ADMIN_LOGIN, {
          userId: Number(user.id),
          action: 'login',
          eventType: 'admin.login',
          entityId: user.id?.toString(),
          metadata: {
            email: user.email,
            name: user.name,
            role: user.role
          }
        });
      } catch (error) {
        console.error("Failed to emit login event:", error);
      }
    }
  }
})