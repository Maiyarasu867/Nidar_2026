import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logId = parseInt(params.id, 10);
    const body = await req.json();
    const memberId = (body.memberId || '').trim();
    const reactionType = body.reactionType || 'like';

    if (isNaN(logId) || !memberId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const member = await queryOne('SELECT id FROM members WHERE id = ?', [memberId]);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if reaction already exists
    const existing = await queryOne<{ id: number }>(`
      SELECT id FROM log_reactions
      WHERE log_id = ? AND member_id = ? AND reaction_type = ?
    `, [logId, memberId, reactionType]);

    if (existing) {
      // Toggle off
      await execute('DELETE FROM log_reactions WHERE id = ?', [existing.id]);
      return NextResponse.json({ action: 'removed' });
    } else {
      // Toggle on
      await execute(`
        INSERT INTO log_reactions (log_id, member_id, reaction_type, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [logId, memberId, reactionType]);
      return NextResponse.json({ action: 'added' });
    }
  } catch (error: any) {
    console.error('Reaction error:', error);
    return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 });
  }
}
