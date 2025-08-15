import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the analysis data from request body
    const { analysis } = await request.json();

    if (!analysis) {
      return NextResponse.json({ 
        error: 'Analysis data required' 
      }, { status: 400 });
    }

    // Upsert the voice profile
    const { error: upsertError } = await supabase
      .from('voice_profiles')
      .upsert({
        user_id: user.id,
        analysis,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error('Error saving voice profile:', upsertError);
      return NextResponse.json({ 
        error: 'Failed to save voice profile' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Voice profile saved successfully'
    });

  } catch (error: any) {
    console.error('Voice profile save error:', error);
    return NextResponse.json({ 
      error: 'Failed to save voice profile' 
    }, { status: 500 });
  }
}