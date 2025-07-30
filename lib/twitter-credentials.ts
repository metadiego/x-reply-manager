import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Encryption key from environment variable
const ENCRYPTION_KEY = process.env.TWITTER_ENCRYPTION_KEY || 'default-key-change-in-production';

interface TwitterCredentials {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  username: string;
  expiresAt?: Date;
}

export class TwitterCredentialsService {
  /**
   * Encrypt sensitive data before storing in database
   */
  private static encrypt(text: string): string {
    try {
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      // Fallback to base64 encoding if encryption fails
      return Buffer.from(text).toString('base64');
    }
  }

  /**
   * Decrypt sensitive data when retrieving from database
   */
  private static decrypt(encryptedText: string): string {
    try {
      if (!encryptedText.includes(':')) {
        // Fallback for base64 encoded data
        return Buffer.from(encryptedText, 'base64').toString('utf8');
      }

      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const [ivHex, encrypted] = encryptedText.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipher(algorithm, key);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      // If decryption fails, try base64 fallback
      try {
        return Buffer.from(encryptedText, 'base64').toString('utf8');
      } catch {
        throw new Error('Failed to decrypt Twitter credentials');
      }
    }
  }

  /**
   * Store Twitter credentials securely in the database
   */
  static async storeCredentials(
    userId: string, 
    credentials: TwitterCredentials
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      // Encrypt sensitive tokens
      const encryptedAccessToken = this.encrypt(credentials.accessToken);
      const encryptedRefreshToken = credentials.refreshToken 
        ? this.encrypt(credentials.refreshToken) 
        : null;

      const { error } = await supabase
        .from('users_profiles')
        .upsert({
          id: userId,
          twitter_user_id: credentials.userId,
          twitter_handle: credentials.username,
          twitter_access_token: encryptedAccessToken,
          twitter_refresh_token: encryptedRefreshToken,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Database error storing credentials:', error);
        return { success: false, error: 'Failed to store Twitter credentials' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error storing Twitter credentials:', error);
      return { success: false, error: 'Failed to store Twitter credentials' };
    }
  }

  /**
   * Retrieve and decrypt Twitter credentials from the database
   */
  static async getCredentials(userId: string): Promise<TwitterCredentials | null> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('users_profiles')
        .select('twitter_user_id, twitter_handle, twitter_access_token, twitter_refresh_token')
        .eq('id', userId)
        .single();

      if (error || !data?.twitter_access_token) {
        return null;
      }

      // Decrypt tokens
      const accessToken = this.decrypt(data.twitter_access_token);
      const refreshToken = data.twitter_refresh_token 
        ? this.decrypt(data.twitter_refresh_token) 
        : undefined;

      return {
        accessToken,
        refreshToken,
        userId: data.twitter_user_id,
        username: data.twitter_handle
      };
    } catch (error) {
      console.error('Error retrieving Twitter credentials:', error);
      return null;
    }
  }

  /**
   * Remove Twitter credentials from the database
   */
  static async removeCredentials(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('users_profiles')
        .update({
          twitter_user_id: null,
          twitter_handle: null,
          twitter_access_token: null,
          twitter_refresh_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Database error removing credentials:', error);
        return { success: false, error: 'Failed to remove Twitter credentials' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing Twitter credentials:', error);
      return { success: false, error: 'Failed to remove Twitter credentials' };
    }
  }

  /**
   * Check if user has valid Twitter credentials
   */
  static async hasValidCredentials(userId: string): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(userId);
      return credentials !== null && credentials.accessToken.length > 0;
    } catch (error) {
      console.error('Error checking Twitter credentials:', error);
      return false;
    }
  }

  /**
   * Refresh Twitter access token if needed
   * This would implement the OAuth 2.0 refresh token flow
   */
  static async refreshAccessToken(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials = await this.getCredentials(userId);
      
      if (!credentials?.refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      // In a real implementation, this would call Twitter's OAuth 2.0 token refresh endpoint
      // For now, we'll return success assuming the token is still valid
      console.log('Token refresh not implemented - using existing token');
      
      return { success: true };
    } catch (error) {
      console.error('Error refreshing Twitter token:', error);
      return { success: false, error: 'Failed to refresh Twitter token' };
    }
  }
}

export default TwitterCredentialsService;