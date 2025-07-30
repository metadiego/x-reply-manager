// Quick script to test database setup and user profile creation
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDatabaseSetup() {
  console.log('🧪 Testing database setup...')
  
  try {
    // Test 1: Check if tables exist
    console.log('\n1. Testing table access...')
    
    const { data: profilesTest, error: profilesError } = await supabase
      .from('users_profiles')
      .select('count')
      .limit(1)
    
    if (profilesError) {
      console.error('❌ users_profiles table access failed:', profilesError.message)
    } else {
      console.log('✅ users_profiles table accessible')
    }

    const { data: targetsTest, error: targetsError } = await supabase
      .from('monitoring_targets')
      .select('count')
      .limit(1)
    
    if (targetsError) {
      console.error('❌ monitoring_targets table access failed:', targetsError.message)
    } else {
      console.log('✅ monitoring_targets table accessible')
    }

    const { data: topicTargetsTest, error: topicTargetsError } = await supabase
      .from('topic_targets')
      .select('count')
      .limit(1)
    
    if (topicTargetsError) {
      console.error('❌ topic_targets table access failed:', topicTargetsError.message)
    } else {
      console.log('✅ topic_targets table accessible')
    }

    // Test 2: Check if trigger function exists
    console.log('\n2. Testing trigger function...')
    const { data: functionTest, error: functionError } = await supabase.rpc('ensure_user_profile', {
      user_uuid: '00000000-0000-0000-0000-000000000000' // Test UUID
    })
    
    if (functionError) {
      console.error('❌ ensure_user_profile function failed:', functionError.message)
    } else {
      console.log('✅ ensure_user_profile function works')
    }
    
    console.log('\n🎉 Database setup test completed!')
    
  } catch (error) {
    console.error('❌ Database setup test failed:', error)
  }
}

testDatabaseSetup()