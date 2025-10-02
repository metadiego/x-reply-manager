import { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string
    refreshToken?: string
    user: {
      id: string
      twitterUserId?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    twitterUserId?: string
    userId?: string
  }
}
