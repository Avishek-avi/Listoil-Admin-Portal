import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { handlers } from "@/lib/auth"

const { GET, POST } = handlers

export { GET, POST }