import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, execute } from '@/lib/db';

export async function GET() {
  try {
    const meetings = await queryAll(`
      SELECT mt.id, mt.title, mt.agenda, mt.scheduled_at, mt.duration_minutes,
             mt.meeting_url, mt.created_by, mt.created_at,
             m.name as created_by_name
      FROM meetings mt
      JOIN members m ON mt.created_by = m.id
      ORDER BY mt.scheduled_at ASC
    `);

    return NextResponse.json({ meetings });
  } catch (error: any) {
    console.error('Meetings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, agenda, scheduled_at, duration_minutes = 30, meeting_url, memberId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 });
    }

    if (!scheduled_at) {
      return NextResponse.json({ error: 'Scheduled date and time is required' }, { status: 400 });
    }

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    const cleanMemberId = memberId.trim();

    const member = await queryOne('SELECT id, name FROM members WHERE id = ?', [cleanMemberId]);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const res = await execute(`
      INSERT INTO meetings (title, agenda, scheduled_at, duration_minutes, meeting_url, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      title.trim(),
      agenda ? agenda.trim() : null,
      scheduled_at,
      Number(duration_minutes) || 30,
      meeting_url ? meeting_url.trim() : null,
      cleanMemberId
    ]);

    const newId = res.lastInsertRowid;
    const meeting = await queryOne(`
      SELECT mt.id, mt.title, mt.agenda, mt.scheduled_at, mt.duration_minutes,
             mt.meeting_url, mt.created_by, mt.created_at,
             m.name as created_by_name
      FROM meetings mt
      JOIN members m ON mt.created_by = m.id
      WHERE mt.id = ?
    `, [newId]);

    return NextResponse.json({ success: true, meeting });
  } catch (error: any) {
    console.error('Meetings POST error:', error);
    return NextResponse.json({ error: 'Failed to schedule meeting' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 });
    }

    await execute('DELETE FROM meetings WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Meetings DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
