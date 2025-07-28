// Twitter OAuth 2.0 Email Retrieval
// According to Twitter docs, email must be retrieved via separate API call

export async function getTwitterUserEmail(accessToken: string): Promise<string | null> {
  if (!accessToken) {
    console.error('❌ No access token provided for Twitter email retrieval');
    return null;
  }

  try {
    console.log('📧 Attempting to retrieve Twitter user email');
    console.log('🔑 Access token prefix:', accessToken.substring(0, 10) + '...');

    // Twitter API v2 endpoint for user data with email
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=email', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('🌐 Twitter API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Twitter API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return null;
    }

    const userData = await response.json();
    console.log('📊 Twitter user data received:', JSON.stringify(userData, null, 2));

    const email = userData.data?.email;
    console.log('📧 Email extracted:', email || 'not found');

    return email || null;
  } catch (error) {
    console.error('🚨 Error retrieving Twitter email:', error);
    return null;
  }
}

export async function getTwitterUserProfile(accessToken: string) {
  if (!accessToken) {
    console.error('❌ No access token provided for Twitter profile retrieval');
    return null;
  }

  try {
    console.log('👤 Attempting to retrieve Twitter user profile');

    // Get comprehensive user data including email
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,email,profile_image_url,public_metrics,verified,description', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('🌐 Twitter profile API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Twitter profile API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return null;
    }

    const profileData = await response.json();
    console.log('📊 Twitter profile data received:', JSON.stringify(profileData, null, 2));

    return profileData.data || null;
  } catch (error) {
    console.error('🚨 Error retrieving Twitter profile:', error);
    return null;
  }
}