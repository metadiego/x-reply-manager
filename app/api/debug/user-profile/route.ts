import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await createClient();
    const userId = session.user.id;
    console.log('Debug - User ID from NextAuth:', userId);

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
      session: {
        user: session.user,
        accessToken: session.accessToken ? 'present' : 'missing',
        refreshToken: session.refreshToken ? 'present' : 'missing',
      },
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