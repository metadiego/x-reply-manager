# Twitter OAuth Setup Guide

This guide explains how to configure Twitter OAuth to capture access tokens for API calls.

## Required Supabase Configuration

### 1. Enable Provider Tokens

In your Supabase project dashboard:

1. Go to **Authentication** → **Providers** → **Twitter**
2. Enable the provider if not already enabled
3. **IMPORTANT**: You need to ensure that provider tokens are saved. In Supabase, this is controlled by the OAuth configuration.

### 2. Supabase CLI Configuration

If using local development with Supabase CLI, add this to your `supabase/config.toml`:

```toml
[auth.external.twitter]
enabled = true
client_id = "your_twitter_client_id"
secret = "your_twitter_client_secret"
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

### 3. Environment Variables

Make sure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Twitter Developer Portal Setup

### 1. Create Twitter OAuth 2.0 App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click on your app → **Settings** → **User authentication settings** → **Set up** (or **Edit**)
3. **CRITICAL**: Configure OAuth 2.0 (NOT OAuth 1.0a):
   - **App permissions**: Read and Write (to post replies)
   - **Type of App**: Web App, Automated App or Bot
   - **App info**:
     - **Callback URI / Redirect URL**:
       - Development: `http://localhost:54321/auth/v1/callback`
       - Production: `https://your-project.supabase.co/auth/v1/callback`
     - **Website URL**: `http://localhost:3000` (or your production URL)
   - **Client type**: Confidential

### 2. Required OAuth 2.0 Scopes

⚠️ **IMPORTANT**: Make sure these scopes are selected:
- `tweet.read` - Read tweets and user data
- `tweet.write` - Post tweets (for posting replies)
- `users.read` - Read user profile information
- `offline.access` - **REQUIRED** for refresh tokens

Without `offline.access`, you won't get refresh tokens!

### 3. Get Your OAuth 2.0 Credentials

After saving, Twitter will show you:
- **Client ID** (starts with letters/numbers, ~30 chars)
- **Client Secret** (click "regenerate" to see it)

⚠️ **Save these immediately** - the Client Secret is only shown once!

Add them to your `.env.local`:
```bash
TWITTER_CLIENT_ID=your_oauth2_client_id
TWITTER_CLIENT_SECRET=your_oauth2_client_secret
```

### 4. Verify OAuth 2.0 vs 1.0a

After logging in, check your token format by visiting: `/api/check-oauth-version`

- OAuth 1.0a tokens: `1234567890-AbCdEfGhIjKlMn` (with dash, 50-60 chars) ❌
- OAuth 2.0 tokens: `QUFBQ19Hd3pwS0VyQjRP...` (100+ chars, no dash) ✅

If you see OAuth 1.0a, you need to **set up OAuth 2.0** in Twitter Developer Portal.

## How It Works

1. **User Login**: User clicks "Continue with Twitter"
2. **OAuth Flow**: Supabase redirects to Twitter for authorization
3. **Callback**: Twitter redirects back to `/auth/callback` with authorization code
4. **Token Exchange**: We exchange code for session, which includes:
   - `provider_token` - Twitter access token
   - `provider_refresh_token` - Twitter refresh token
5. **Store Tokens**: We save these tokens to `users_profiles` table
6. **Use Tokens**: We use these tokens to make Twitter API calls on behalf of the user

## Testing Token Storage

After login, check your `users_profiles` table:

```sql
SELECT
  id,
  twitter_handle,
  twitter_user_id,
  CASE WHEN twitter_access_token IS NOT NULL THEN 'YES' ELSE 'NO' END as has_access_token,
  CASE WHEN twitter_refresh_token IS NOT NULL THEN 'YES' ELSE 'NO' END as has_refresh_token
FROM users_profiles;
```

## Token Security

⚠️ **IMPORTANT**:
- Tokens are stored in the database
- Consider encrypting tokens at rest (implement application-level encryption)
- Never expose tokens to the client-side
- Only use tokens in server-side code (Server Actions, API routes)
- Use RLS policies to ensure users can only access their own tokens

## Troubleshooting

### Tokens are NULL after login

1. Check Supabase logs: Authentication → Logs
2. Verify Twitter app has correct scopes
3. Ensure callback URL matches exactly
4. Check that `provider_token` is available in the session after `exchangeCodeForSession`

### "Invalid scope" error

- Make sure your Twitter app has all required scopes enabled
- Try re-authorizing the app in Twitter settings
- Verify the scopes in `twitter-login-button.tsx` match your Twitter app configuration

### Tokens expire

- Use `provider_refresh_token` to get new access tokens
- Implement token refresh logic (see `lib/twitter-metrics.ts`)
- Twitter access tokens typically last 2 hours
