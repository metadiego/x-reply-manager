# Hybrid OAuth 2.0 Implementation

## Overview
This implementation adds Twitter OAuth 2.0 support alongside Supabase Auth (OAuth 1.0a) to enable full Twitter API v2 functionality.

## What Was Implemented

### 1. Database Changes
- **New table**: `twitter_oauth2_connections`
  - Stores encrypted OAuth 2.0 access and refresh tokens
  - One connection per user (unique constraint)
  - RLS policies for user-only access
- **Updated table**: `users_profiles`
  - Added `twitter_oauth2_connected` boolean flag

### 2. Core OAuth 2.0 Utilities (`lib/twitter-oauth2.ts`)
- `encryptToken()` / `decryptToken()` - AES-256-GCM encryption for tokens
- `generateCodeVerifier()` / `generateCodeChallenge()` - PKCE implementation
- `generateState()` - CSRF protection
- `getOAuth2Token()` - Retrieves valid token, auto-refreshes if expired
- `refreshOAuth2Token()` - Refreshes expired tokens
- `storeOAuth2Tokens()` - Securely stores tokens in database
- `revokeOAuth2Token()` - Revokes and disconnects
- `hasOAuth2Connection()` - Checks connection status

### 3. API Routes
- **`/api/twitter-oauth/connect`** (GET)
  - Generates PKCE parameters
  - Stores state + code_verifier in HTTP-only cookies
  - Redirects to Twitter authorization
- **`/api/twitter-oauth/callback`** (GET)
  - Validates state (CSRF protection)
  - Exchanges authorization code for tokens using PKCE
  - Stores encrypted tokens in database
  - Redirects to processing page
- **`/api/twitter-oauth/refresh`** (POST)
  - Manually refreshes tokens (also happens automatically)
- **`/api/twitter-oauth/disconnect`** (POST)
  - Revokes tokens with Twitter
  - Deletes connection from database

### 4. UI Components
- **`ConnectTwitterButton`**
  - Client component for initiating OAuth flow
  - Shows loading state during redirect
- **`TwitterConnectionStatus`**
  - Shows connection status
  - Allows disconnecting
  - Shows reconnect options if disconnected

### 5. Onboarding Flow Updates
New flow (4 steps instead of 3):
1. **Create Target** → `/onboarding/create-target`
2. **Voice Profile** → `/onboarding/voice-profile`
3. **Connect Twitter** → `/onboarding/connect-twitter` ✨ NEW
4. **Processing** → `/onboarding/processing-user` → Home

Changes made:
- Updated voice-profile page to redirect to connect-twitter
- Changed progress indicator from "Step 3 of 3" to "Step 3 of 4"
- Created new connect-twitter onboarding page
- Added skip option (with warning)
- Updated processing-user to handle missing OAuth 2.0 connection

### 6. Updated Twitter Metrics
- Changed `lib/twitter-metrics.ts` to use OAuth 2.0 tokens
- Replaced `getValidTwitterToken()` with `getOAuth2Token()`
- Replaced `refreshTwitterToken()` with `refreshOAuth2Token()`
- Automatic token refresh on 401 responses

## Required Configuration

### Environment Variables
Add to `.env.local`:
```bash
# Twitter OAuth 2.0 Credentials
TWITTER_OAUTH2_CLIENT_ID=your_oauth2_client_id
TWITTER_OAUTH2_CLIENT_SECRET=your_oauth2_client_secret
TWITTER_OAUTH2_REDIRECT_URI=http://localhost:3000/api/twitter-oauth/callback

# Token Encryption (must be exactly 32 characters)
ENCRYPTION_KEY=your_32_character_encryption_key
```

### Twitter Developer Portal Setup
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click your app → **Settings** → **User authentication settings**
3. Configure OAuth 2.0:
   - **App permissions**: Read and Write
   - **Type of App**: Web App, Automated App or Bot
   - **Callback URI**: `http://localhost:3000/api/twitter-oauth/callback`
   - **Website URL**: `http://localhost:3000`
4. **Scopes** (CRITICAL):
   - `tweet.read`
   - `tweet.write`
   - `users.read`
   - `offline.access` (required for refresh tokens!)
5. Copy **Client ID** and **Client Secret**

## Database Migration
Run the migration:
```bash
npx supabase db push
```

Or if using hosted Supabase, the migration will run automatically on next deployment.

## Security Features

### PKCE (Proof Key for Code Exchange)
- Generates random code_verifier (128 characters)
- Creates SHA256 hash as code_challenge
- Prevents authorization code interception attacks

### CSRF Protection
- Random state parameter generated for each request
- Stored in HTTP-only cookie
- Validated on callback

### Token Encryption
- AES-256-GCM encryption for tokens at rest
- 32-byte encryption key from environment
- Tokens only decrypted when needed for API calls

### RLS Policies
- Users can only access their own OAuth connections
- Automatic user_id validation via `auth.uid()`

## How It Works

### OAuth Flow
1. User clicks "Connect My Twitter"
2. Browser redirects to `/api/twitter-oauth/connect`
3. Server generates PKCE + state, stores in cookies
4. Server redirects to Twitter authorization page
5. User authorizes on Twitter
6. Twitter redirects to `/api/twitter-oauth/callback` with code
7. Server validates state, exchanges code for tokens using PKCE
8. Server encrypts and stores tokens in database
9. Server redirects to processing page

### Token Usage
1. When fetching metrics, `getOAuth2Token()` is called
2. Function checks if token is expired
3. If expired, automatically calls `refreshOAuth2Token()`
4. Returns valid token for API request
5. On 401 response, token is refreshed and request retried

## Files Created
1. `supabase/migrations/20250131000005_add_twitter_oauth2.sql`
2. `lib/twitter-oauth2.ts`
3. `app/api/twitter-oauth/connect/route.ts`
4. `app/api/twitter-oauth/callback/route.ts`
5. `app/api/twitter-oauth/refresh/route.ts`
6. `app/api/twitter-oauth/disconnect/route.ts`
7. `app/onboarding/connect-twitter/page.tsx`
8. `components/twitter-oauth/connect-button.tsx`
9. `components/twitter-oauth/connection-status.tsx`

## Files Modified
1. `app/onboarding/voice-profile/page.tsx`
2. `lib/twitter-metrics.ts`
3. `app/onboarding/processing-user/page.tsx`

## Testing Checklist
- [ ] Run database migration
- [ ] Add environment variables
- [ ] Configure Twitter OAuth 2.0 app
- [ ] Test onboarding flow (new user)
- [ ] Test Twitter connection
- [ ] Test metrics fetching with OAuth 2.0 tokens
- [ ] Test token refresh on expiration
- [ ] Test disconnect functionality
- [ ] Test skip option in onboarding
- [ ] Verify token encryption/decryption
- [ ] Verify CSRF protection
- [ ] Verify PKCE implementation

## Troubleshooting

### "ENCRYPTION_KEY must be 32 characters"
Generate a key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex').slice(0, 32))"
```

### "Invalid state" error
- Clear browser cookies
- Make sure callback URL matches exactly in Twitter settings

### "No OAuth 2.0 token found"
- Check user completed Twitter connection in onboarding
- Verify `twitter_oauth2_connected` is true in database
- Check `twitter_oauth2_connections` table has record

### Tokens not working with Twitter API
- Verify you're using OAuth 2.0, not 1.0a
- Check token format (should be long base64 string, not `123-ABC` format)
- Ensure `offline.access` scope is granted
- Check token hasn't been revoked in Twitter settings
