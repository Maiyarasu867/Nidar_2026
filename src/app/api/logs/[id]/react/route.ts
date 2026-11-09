import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logId = parseInt(params.id, 10);
    const body = await req.json();
    const memberId = (body.memberId || '').trim().toUpperCase();
    const reactionType = body.reactionType || 'like';

    if (isNaN(logId) || !memberId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = getDb();
    const member = db.prepare('SELECT id FROM members WHERE id = ?').get(memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if reaction already exists
    const existing = db.prepare(`
      SELECT id FROM log_reactions
      WHERE log_id = ? AND member_id = ? AND reaction_type = ?
    `).get(logId, memberId, reactionType);

    if (existing) {
      // Toggle off
      db.prepare('DELETE FROM log_reactions WHERE id = ?').run(existing.id);
      return NextResponse.json({ action: 'removed' });
    } else {
      // Toggle on
      db.prepare(`
        INSERT INTO log_reactions (log_id, member_id, reaction_type, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(logId, memberId, reactionType);
      return NextResponse.json({ action: 'added' });
    }
  } catch (error: any) {
    console.error('Reaction error:', error);
    return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 });
  }
}
