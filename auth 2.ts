import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import TwitterProvider from "next-auth/providers/twitter"
import { SupabaseAdapter } from "@auth/supabase-adapter"

export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_OAUTH2_CLIENT_ID!,
      clientSecret: process.env.TWITTER_OAUTH2_CLIENT_SECRET!,
      version: "2.0",
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "tweet.read tweet.write users.read offline.access"
        }
      }
    })
  ],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async linkAccount({ user, account, profile }) {
      // This event fires when an OAuth account is linked to a user
      console.log('[NextAuth linkAccount event] Linking account for user:', user.id)

      try {
        const twitterProfile = profile as any

        console.log('[NextAuth linkAccount event] Account:', account)

        console.log('[NextAuth linkAccount event] Twitter profile:', twitterProfile)

        console.log('[NextAuth linkAccount event] User:', user)

        // First, create or update users_profiles with Twitter data
        const profileData = {
          id: user.id,
          twitter_handle: twitterProfile.data?.username || null,
          twitter_user_id: account.providerAccountId,
          twitter_access_token: account.access_token || null,
          twitter_refresh_token: account.refresh_token || null,
          onboarding_completed: false,
          subscription_tier: 'free',
          timezone: 'UTC',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Check if profile exists first
        const checkResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users_profiles?id=eq.${user.id}&select=id`,
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            },
          }
        )

        const existingProfiles = await checkResponse.json()
        const profileExists = Array.isArray(existingProfiles) && existingProfiles.length > 0

        if (profileExists) {
          // Update existing profile
          const updateData = {
            twitter_handle: twitterProfile.data?.username || null,
            twitter_user_id: account.providerAccountId,
            twitter_access_token: account.access_token || null,
            twitter_refresh_token: account.refresh_token || null,
            updated_at: new Date().toISOString(),
          }

          const updateResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users_profiles?id=eq.${user.id}`,
            {
              method: 'PATCH',
              headers: {
                apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updateData),
            }
          )

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text()
            console.error('[NextAuth linkAccount] Failed to update user profile:', errorText)
          } else {
            console.log('[NextAuth linkAccount] Successfully updated user profile')
          }
        } else {
          // Create new profile
          const createResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users_profiles`,
            {
              method: 'POST',
              headers: {
                apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(profileData),
            }
          )

          if (!createResponse.ok) {
            const errorText = await createResponse.text()
            console.error('[NextAuth linkAccount] Failed to create user profile:', errorText)
            // Don't create processing state if profile creation failed
            return
          } else {
            console.log('[NextAuth linkAccount] Successfully created user profile')
          }
        }

        // After profile is created/updated, create user_processing_state if it doesn't exist
        const stateCheckResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_processing_state?user_id=eq.${user.id}&select=user_id`,
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            },
          }
        )

        const existingStates = await stateCheckResponse.json()
        const stateExists = Array.isArray(existingStates) && existingStates.length > 0

        if (!stateExists) {
          const stateData = {
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          const stateResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_processing_state`,
            {
              method: 'POST',
              headers: {
                apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(stateData),
            }
          )

          if (!stateResponse.ok) {
            const errorText = await stateResponse.text()
            console.error('[NextAuth linkAccount] Failed to create user processing state:', errorText)
          } else {
            console.log('[NextAuth linkAccount] Successfully created user processing state')
          }
        } else {
          console.log('[NextAuth linkAccount] User processing state already exists')
        }
      } catch (error) {
        console.error('[NextAuth linkAccount] Error during profile/state creation:', error)
      }
    },
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Initial sign in
      if (account && profile) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.twitterUserId = account.providerAccountId
        token.userId = user?.id
      }
      return token
    },
    async session({ session, token }) {
      // Add data to session from JWT token
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.user.id = token.userId as string
      session.user.twitterUserId = token.twitterUserId as string
      return session
    },
    async signIn() {
      // Just allow sign in - user creation happens in events
      return true
    },
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/onboarding', // Redirect new users to onboarding
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
