import { TwitterCredentialsService } from './twitter-credentials'

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export interface TwitterPost {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  referenced_tweets?: Array<{
    type: string;
    id: string;
  }>;
  context_annotations?: Array<{
    domain: {
      id: string;
      name: string;
      description: string;
    };
    entity: {
      id: string;
      name: string;
      description: string;
    };
  }>;
}

export interface TwitterList {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  member_count?: number;
  follower_count?: number;
  private?: boolean;
}

export class TwitterApiService {
  private credentialsService: TwitterCredentialsService;

  constructor() {
    this.credentialsService = new TwitterCredentialsService();
  }

  private async makeTwitterRequest(
    userId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const credentials = await this.credentialsService.getCredentials(userId);
    
    if (!credentials?.accessToken) {
      throw new Error('No Twitter credentials found for user');
    }

    const baseUrl = 'https://api.twitter.com/2';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Twitter API error (${response.status}):`, errorData);
      
      if (response.status === 401) {
        throw new Error('Twitter authentication expired. Please reconnect your account.');
      }
      
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getCurrentUser(userId: string): Promise<TwitterUser | null> {
    try {
      const response = await this.makeTwitterRequest(
        userId,
        '/users/me?user.fields=id,username,name,profile_image_url,public_metrics'
      );
      
      return response.data || null;
    } catch (error) {
      console.error('Error fetching current Twitter user:', error);
      return null;
    }
  }

  async getUserTweets(
    userId: string,
    twitterUserId: string,
    maxResults: number = 10
  ): Promise<TwitterPost[]> {
    try {
      const response = await this.makeTwitterRequest(
        userId,
        `/users/${twitterUserId}/tweets?max_results=${maxResults}&tweet.fields=id,text,created_at,author_id,public_metrics,referenced_tweets,context_annotations&exclude=retweets,replies`
      );
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user tweets:', error);
      return [];
    }
  }

  async searchTweets(
    userId: string,
    query: string,
    maxResults: number = 10
  ): Promise<TwitterPost[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await this.makeTwitterRequest(
        userId,
        `/tweets/search/recent?query=${encodedQuery}&max_results=${maxResults}&tweet.fields=id,text,created_at,author_id,public_metrics,referenced_tweets,context_annotations&user.fields=username,name&expansions=author_id`
      );
      
      return response.data || [];
    } catch (error) {
      console.error('Error searching tweets:', error);
      return [];
    }
  }

  async getUserLists(userId: string): Promise<TwitterList[]> {
    try {
      const credentials = await this.credentialsService.getCredentials(userId);
      if (!credentials?.twitterUserId) {
        throw new Error('No Twitter user ID found');
      }

      const response = await this.makeTwitterRequest(
        userId,
        `/users/${credentials.twitterUserId}/owned_lists?list.fields=id,name,description,owner_id,member_count,follower_count,private`
      );
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user lists:', error);
      return [];
    }
  }

  async getListTweets(
    userId: string,
    listId: string,
    maxResults: number = 10
  ): Promise<TwitterPost[]> {
    try {
      const response = await this.makeTwitterRequest(
        userId,
        `/lists/${listId}/tweets?max_results=${maxResults}&tweet.fields=id,text,created_at,author_id,public_metrics,referenced_tweets,context_annotations&user.fields=username,name&expansions=author_id`
      );
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching list tweets:', error);
      return [];
    }
  }

  async postTweet(
    userId: string,
    text: string,
    replyToTweetId?: string
  ): Promise<{ id: string; text: string } | null> {
    try {
      const body: any = { text };
      
      if (replyToTweetId) {
        body.reply = {
          in_reply_to_tweet_id: replyToTweetId
        };
      }

      const response = await this.makeTwitterRequest(
        userId,
        '/tweets',
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      
      return response.data || null;
    } catch (error) {
      console.error('Error posting tweet:', error);
      return null;
    }
  }

  async verifyCredentials(userId: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser(userId);
      return !!user;
    } catch (error) {
      console.error('Error verifying Twitter credentials:', error);
      return false;
    }
  }
}

export const twitterApiService = new TwitterApiService();