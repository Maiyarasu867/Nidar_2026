import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryAll, execute } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logId = parseInt(params.id, 10);
    if (isNaN(logId)) {
      return NextResponse.json({ error: 'Invalid log ID' }, { status: 400 });
    }

    const body = await req.json();
    const memberId = (body.memberId || '').trim();
    const content = (body.content || '').trim();
    const blockers = (body.blockers || '').trim() || null;
    const category = (body.category || 'General').trim();
    const attachmentNotes = body.attachmentNotes as Record<string, string> | undefined;

    if (!memberId) {
      return NextResponse.json({ error: 'Member authentication required' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'Log content cannot be empty' }, { status: 400 });
    }

    // Verify existing log
    const log = await queryOne<{ id: number; member_id: string; created_at: string }>(
      'SELECT id, member_id, created_at FROM progress_logs WHERE id = ?',
      [logId]
    );

    if (!log) {
      return NextResponse.json({ error: 'Progress log not found' }, { status: 404 });
    }

    // Authorization: only the author can edit their own log
    if (log.member_id !== memberId) {
      return NextResponse.json({ error: 'You can only edit your own progress logs' }, { status: 403 });
    }

    // Rule: Log can only be edited within that day (same calendar date)
    const logDate = new Date(log.created_at);
    const today = new Date();
    const isSameDay = logDate.toDateString() === today.toDateString();

    if (!isSameDay) {
      return NextResponse.json(
        { error: 'Logs can only be edited on the same day they were posted.' },
        { status: 403 }
      );
    }

    // Update log
    await execute(`
      UPDATE progress_logs
      SET content = ?, blockers = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [content, blockers, category, logId]);

    // Update attachment notes if provided
    if (attachmentNotes && typeof attachmentNotes === 'object') {
      for (const [attIdStr, noteText] of Object.entries(attachmentNotes)) {
        const attId = parseInt(attIdStr, 10);
        if (!isNaN(attId)) {
          const cleanNote = (noteText || '').trim() || null;
          await execute(`
            UPDATE log_attachments
            SET note = ?
            WHERE id = ? AND log_id = ?
          `, [cleanNote, attId, logId]);
        }
      }
    }

    // Fetch updated log
    const updated = await queryOne(`
      SELECT l.id, l.member_id, l.content, l.blockers, l.category, l.created_at, l.updated_at,
             m.name as member_name, m.role as member_role, m.username as member_username
      FROM progress_logs l
      JOIN members m ON l.member_id = m.id
      WHERE l.id = ?
    `, [logId]);

    const attachments = await queryAll(`
      SELECT id, log_id, file_url, file_name, file_size, mime_type, note, created_at
      FROM log_attachments
      WHERE log_id = ?
    `, [logId]);

    const reactions = await queryAll(`
      SELECT r.id, r.log_id, r.member_id, r.reaction_type, m.name as member_name
      FROM log_reactions r
      JOIN members m ON r.member_id = m.id
      WHERE r.log_id = ?
    `, [logId]);

    const fullLog = {
      ...updated,
      attachments,
      reactions,
    };

    return NextResponse.json({ success: true, log: fullLog });
  } catch (error: any) {
    console.error('Failed to edit log:', error);
    return NextResponse.json({ error: error.message || 'Failed to update log' }, { status: 500 });
  }
}
