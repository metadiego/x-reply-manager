import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const userId = session.user.id;

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
        user_id: userId,
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