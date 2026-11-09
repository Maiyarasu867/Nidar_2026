import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function generateMemberId(db: any): string {
  let id = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 20) {
    attempts++;
    const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit number 100-999
    id = `NDR-${randomNum}`;
    const check = db.prepare('SELECT id FROM members WHERE id = ?').get(id);
    if (!check) {
      exists = false;
    }
  }

  if (exists) {
    // Fallback if dense
    id = `NDR-${Date.now().toString().slice(-4)}`;
  }

  return id;
}

export async function GET() {
  try {
    const db = getDb();
    const members = db.prepare(`
      SELECT id, name, role, created_at, last_active_at,
             (SELECT COUNT(*) FROM progress_logs WHERE member_id = members.id) as log_count
      FROM members 
      ORDER BY last_active_at DESC
    `).all();

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Failed to list members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, name, role, passcode, memberId } = body;
    const db = getDb();

    if (action === 'register') {
      const requiredPasscode = process.env.PROJECT_PASSCODE || 'NIDAR2026';
      if (!passcode || passcode.trim() !== requiredPasscode.trim()) {
        return NextResponse.json(
          { error: 'Invalid Project Passcode. Please get the access key from your team lead.' },
          { status: 401 }
        );
      }

      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
      }

      if (!role || !role.trim()) {
        return NextResponse.json({ error: 'Please enter your project role.' }, { status: 400 });
      }

      const id = generateMemberId(db);
      db.prepare(`
        INSERT INTO members (id, name, role, created_at, last_active_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(id, name.trim(), role.trim());

      const member = db.prepare('SELECT id, name, role, created_at, last_active_at FROM members WHERE id = ?').get(id);
      return NextResponse.json({ success: true, member });
    }

    if (action === 'login') {
      if (!memberId || !memberId.trim()) {
        return NextResponse.json({ error: 'Please provide your Member ID.' }, { status: 400 });
      }

      const cleanId = memberId.trim().toUpperCase();
      const member = db.prepare('SELECT id, name, role, created_at, last_active_at FROM members WHERE id = ?').get(cleanId);

      if (!member) {
        return NextResponse.json(
          { error: `Member ID "${cleanId}" not found. If this is your first time, choose "New Member".` },
          { status: 404 }
        );
      }

      // Update last active
      db.prepare('UPDATE members SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(cleanId);
      const updatedMember = db.prepare('SELECT id, name, role, created_at, last_active_at FROM members WHERE id = ?').get(cleanId);

      return NextResponse.json({ success: true, member: updatedMember });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
