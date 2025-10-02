import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// GET /api/targets - List user's monitoring targets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const userId = session.user.id;

    // Fetch user's monitoring targets with their configurations
    const { data: targets, error } = await supabase
      .from('monitoring_targets')
      .select(`
        *,
        topic_targets (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching targets:', error);
      return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 });
    }

    return NextResponse.json({ targets });
  } catch (error: any) {
    console.error('Error in GET /api/targets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/targets - Create a new monitoring target
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const userId = session.user.id;

    const body = await request.json();
    const { name, keywords, hashtags, excludeKeywords, minEngagement } = body;

    // Validate required fields
    if (!name || (!keywords?.length && !hashtags?.length)) {
      return NextResponse.json({ 
        error: 'Name and at least one keyword or hashtag are required' 
      }, { status: 400 });
    }

    // Start a transaction by creating monitoring target first
    const { data: monitoringTarget, error: targetError } = await supabase
      .from('monitoring_targets')
      .insert({
        user_id: user.id,
        name,
        target_type: 'topic',
        status: 'active'
      })
      .select()
      .single();

    if (targetError) {
      console.error('Error creating monitoring target:', targetError);
      return NextResponse.json({ error: 'Failed to create target' }, { status: 500 });
    }

    // Create topic configuration
    const { data: topicTarget, error: topicError } = await supabase
      .from('topic_targets')
      .insert({
        monitoring_target_id: monitoringTarget.id,
        keywords: keywords || [],
        hashtags: hashtags || [],
        exclude_keywords: excludeKeywords || [],
        min_engagement: minEngagement || 0,
        languages: ['en']
      })
      .select()
      .single();

    if (topicError) {
      console.error('Error creating topic configuration:', topicError);
      // Try to rollback by deleting the monitoring target
      await supabase
        .from('monitoring_targets')
        .delete()
        .eq('id', monitoringTarget.id);
      
      return NextResponse.json({ error: 'Failed to create topic configuration' }, { status: 500 });
    }

    // Return the complete target object
    const completeTarget = {
      ...monitoringTarget,
      topic_targets: topicTarget
    };

    return NextResponse.json({ target: completeTarget }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/targets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/targets?id=<target_id> - Update a target
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('id');
    
    if (!targetId) {
      return NextResponse.json({ error: 'Target ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, keywords, hashtags, excludeKeywords, minEngagement, status } = body;

    // Verify target ownership
    const { data: existingTarget, error: fetchError } = await supabase
      .from('monitoring_targets')
      .select('id')
      .eq('id', targetId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingTarget) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    // Update monitoring target
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (status) updateData.status = status;

    const { error: updateError } = await supabase
      .from('monitoring_targets')
      .update(updateData)
      .eq('id', targetId);

    if (updateError) {
      console.error('Error updating monitoring target:', updateError);
      return NextResponse.json({ error: 'Failed to update target' }, { status: 500 });
    }

    // Update topic configuration if topic-related fields are provided
    if (keywords !== undefined || hashtags !== undefined || excludeKeywords !== undefined || minEngagement !== undefined) {
      const topicUpdateData: any = { updated_at: new Date().toISOString() };
      if (keywords !== undefined) topicUpdateData.keywords = keywords || [];
      if (hashtags !== undefined) topicUpdateData.hashtags = hashtags || [];
      if (excludeKeywords !== undefined) topicUpdateData.exclude_keywords = excludeKeywords || [];
      if (minEngagement !== undefined) topicUpdateData.min_engagement = minEngagement || 0;

      const { error: topicError } = await supabase
        .from('topic_targets')
        .update(topicUpdateData)
        .eq('monitoring_target_id', targetId);

      if (topicError) {
        console.error('Error updating topic configuration:', topicError);
        return NextResponse.json({ error: 'Failed to update topic configuration' }, { status: 500 });
      }
    }

    // Fetch and return updated target
    const { data: updatedTarget, error: finalError } = await supabase
      .from('monitoring_targets')
      .select(`
        *,
        topic_targets (*)
      `)
      .eq('id', targetId)
      .single();

    if (finalError) {
      return NextResponse.json({ error: 'Failed to fetch updated target' }, { status: 500 });
    }

    return NextResponse.json({ target: updatedTarget });
  } catch (error: any) {
    console.error('Error in PUT /api/targets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/targets?id=<target_id> - Delete a target
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('id');
    
    if (!targetId) {
      return NextResponse.json({ error: 'Target ID is required' }, { status: 400 });
    }

    // Verify ownership and delete (cascade will handle topic_targets)
    const { error } = await supabase
      .from('monitoring_targets')
      .delete()
      .eq('id', targetId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting target:', error);
      return NextResponse.json({ error: 'Failed to delete target' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/targets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}