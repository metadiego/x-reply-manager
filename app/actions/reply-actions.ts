'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

/**
 * Update the status of a reply suggestion
 */
export async function updateReplyStatus(replyId: string, status: 'posted' | 'skipped') {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient();
  const userId = session.user.id;

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'posted') {
    updateData.posted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('reply_suggestions')
    .update(updateData)
    .eq('id', replyId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to update reply status: ${error.message}`);
  }

  revalidatePath('/');
}

/**
 * Edit a reply suggestion
 */
export async function editReplySuggestion(replyId: string, newText: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient();
  const userId = session.user.id;

  const { error } = await supabase
    .from('reply_suggestions')
    .update({
      user_edited_reply: newText,
      status: 'edited',
      updated_at: new Date().toISOString()
    })
    .eq('id', replyId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to edit reply: ${error.message}`);
  }

  revalidatePath('/');
}

/**
 * Post a reply to Twitter (placeholder for now)
 * In production, this would integrate with Twitter API
 */
export async function postReplyToTwitter(replyId: string, replyText: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // TODO: Implement actual Twitter posting logic here
  // For now, just update the status to 'posted'

  console.log(`Would post reply: "${replyText}"`);

  // Update status to posted
  await updateReplyStatus(replyId, 'posted');

  revalidatePath('/');
}

/**
 * Reject a reply suggestion
 */
export async function rejectReply(replyId: string) {
  await updateReplyStatus(replyId, 'skipped');
}