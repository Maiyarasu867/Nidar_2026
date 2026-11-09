import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const memberId = (searchParams.get('memberId') || '').trim().toUpperCase();

    let query = `
      SELECT c.id, c.title, c.category, c.is_completed, c.is_personal, c.created_by, c.completed_by,
             c.created_at, c.completed_at,
             m1.name as created_by_name,
             m2.name as completed_by_name
      FROM checklists c
      JOIN members m1 ON c.created_by = m1.id
      LEFT JOIN members m2 ON c.completed_by = m2.id
    `;
    const params: any[] = [];

    if (memberId) {
      // Return all team tasks (is_personal = 0) PLUS this member's personal tasks (is_personal = 1 AND created_by = memberId)
      query += ` WHERE c.is_personal = 0 OR (c.is_personal = 1 AND c.created_by = ?)`;
      params.push(memberId);
    } else {
      // Only team tasks
      query += ` WHERE c.is_personal = 0`;
    }

    query += ` ORDER BY c.is_completed ASC, c.created_at DESC`;

    const items = db.prepare(query).all(...params);
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Checklist GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch checklist items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category = 'General', memberId, is_personal = 0 } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    const cleanMemberId = memberId.trim().toUpperCase();
    const isPersonalInt = is_personal ? 1 : 0;
    const db = getDb();

    const member = db.prepare('SELECT id, name FROM members WHERE id = ?').get(cleanMemberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const insert = db.prepare(`
      INSERT INTO checklists (title, category, is_completed, is_personal, created_by, created_at)
      VALUES (?, ?, 0, ?, ?, CURRENT_TIMESTAMP)
    `);
    const res = insert.run(title.trim(), category.trim(), isPersonalInt, cleanMemberId);
    const newId = Number(res.lastInsertRowid);

    const item = db.prepare(`
      SELECT c.id, c.title, c.category, c.is_completed, c.is_personal, c.created_by, c.completed_by,
             c.created_at, c.completed_at,
             m.name as created_by_name
      FROM checklists c
      JOIN members m ON c.created_by = m.id
      WHERE c.id = ?
    `).get(newId);

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Checklist POST error:', error);
    return NextResponse.json({ error: 'Failed to add checklist item' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_completed, memberId } = body;

    if (id === undefined || is_completed === undefined || !memberId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const cleanMemberId = memberId.trim().toUpperCase();
    const db = getDb();

    if (is_completed) {
      db.prepare(`
        UPDATE checklists
        SET is_completed = 1,
            completed_by = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cleanMemberId, id);
    } else {
      db.prepare(`
        UPDATE checklists
        SET is_completed = 0,
            completed_by = NULL,
            completed_at = NULL
        WHERE id = ?
      `).run(id);
    }

    const updated = db.prepare(`
      SELECT c.id, c.title, c.category, c.is_completed, c.is_personal, c.created_by, c.completed_by,
             c.created_at, c.completed_at,
             m1.name as created_by_name,
             m2.name as completed_by_name
      FROM checklists c
      JOIN members m1 ON c.created_by = m1.id
      LEFT JOIN members m2 ON c.completed_by = m2.id
      WHERE c.id = ?
    `).get(id);

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error('Checklist PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM checklists WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Checklist DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
  }
}
