import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getClaims();
    
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: "Not authenticated", authError }, { status: 401 });
    }

    const userId = authData.claims.sub;
    console.log('Debug - User ID from auth:', userId);

    // Check if user exists in auth.users (server-side check)
    const { data: authUser, error: authUserError } = await supabase.auth.getUser();
    console.log('Debug - Auth user:', authUser, 'Error:', authUserError);

    // Check users_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('users_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('Debug - User profile:', profile, 'Error:', profileError);

    // Check monitoring_targets count
    const { count: targetsCount, error: targetsError } = await supabase
      .from('monitoring_targets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    console.log('Debug - Targets count:', targetsCount, 'Error:', targetsError);

    // Check if we can read from users_profiles (permission test)
    const { error: testInsertError } = await supabase
      .from('users_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      userId,
      authUser: authUser?.user ? { id: authUser.user.id, email: authUser.user.email } : null,
      authUserError,
      profile,
      profileError: profileError ? {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details
      } : null,
      targetsCount,
      targetsError: targetsError ? {
        code: targetsError.code,
        message: targetsError.message,
        details: targetsError.details
      } : null,
      testInsertError: testInsertError ? {
        code: testInsertError.code,
        message: testInsertError.message,
        details: testInsertError.details
      } : null
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}