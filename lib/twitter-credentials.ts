import { createClient } from '@/lib/supabase/server'
import { createClient as createClientClient } from '@/lib/supabase/client'

// Simple encryption using base64 for MVP (should use proper encryption in production)
// TODO: Replace with proper encryption (AES-256) in production
function encryptToken(token: string): string {
  if (!token) return '';
  return Buffer.from(token).toString('base64');
}

function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) return '';
  try {
    return Buffer.from(encryptedToken, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

export interface TwitterCredentials {
  accessToken: string;
  refreshToken: string;
  twitterUserId: string;
  twitterHandle: string;
}

export class TwitterCredentialsService {
  private supabase: any;

  constructor(isClient = false) {
    // Use client or server supabase based on context
    this.supabase = isClient ? createClientClient() : null;
  }

  private async getSupabaseClient() {
    if (this.supabase) {
      return this.supabase;
    }
    return await createClient();
  }

  async storeCredentials(userId: string, credentials: TwitterCredentials): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { error } = await supabase
        .from('users_profiles')
        .upsert({
          id: userId,
          twitter_handle: credentials.twitterHandle,
          twitter_user_id: credentials.twitterUserId,
          twitter_access_token: encryptToken(credentials.accessToken),
          twitter_refresh_token: encryptToken(credentials.refreshToken),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error storing Twitter credentials:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error storing Twitter credentials:', error);
      return false;
    }
  }

  async getCredentials(userId: string): Promise<TwitterCredentials | null> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from('users_profiles')
        .select('twitter_handle, twitter_user_id, twitter_access_token, twitter_refresh_token')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error retrieving Twitter credentials:', error);
        return null;
      }

      if (!data.twitter_access_token || !data.twitter_user_id) {
        return null;
      }

      return {
        accessToken: decryptToken(data.twitter_access_token),
        refreshToken: decryptToken(data.twitter_refresh_token || ''),
        twitterUserId: data.twitter_user_id,
        twitterHandle: data.twitter_handle || ''
      };
    } catch (error) {
      console.error('Error retrieving Twitter credentials:', error);
      return null;
    }
  }

  async updateCredentials(userId: string, newCredentials: Partial<TwitterCredentials>): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (newCredentials.accessToken) {
        updateData.twitter_access_token = encryptToken(newCredentials.accessToken);
      }
      
      if (newCredentials.refreshToken) {
        updateData.twitter_refresh_token = encryptToken(newCredentials.refreshToken);
      }
      
      if (newCredentials.twitterHandle) {
        updateData.twitter_handle = newCredentials.twitterHandle;
      }
      
      if (newCredentials.twitterUserId) {
        updateData.twitter_user_id = newCredentials.twitterUserId;
      }

      const { error } = await supabase
        .from('users_profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Error updating Twitter credentials:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating Twitter credentials:', error);
      return false;
    }
  }

  async removeCredentials(userId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { error } = await supabase
        .from('users_profiles')
        .update({
          twitter_access_token: null,
          twitter_refresh_token: null,
          twitter_handle: null,
          twitter_user_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error removing Twitter credentials:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing Twitter credentials:', error);
      return false;
    }
  }

  async hasValidCredentials(userId: string): Promise<boolean> {
    const credentials = await this.getCredentials(userId);
    return !!(credentials?.accessToken && credentials?.twitterUserId);
  }
}

// Singleton instances for server and client use
export const twitterCredentialsService = new TwitterCredentialsService(false);
export const twitterCredentialsClientService = new TwitterCredentialsService(true);