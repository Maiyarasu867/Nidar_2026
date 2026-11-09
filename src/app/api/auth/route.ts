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
      SELECT id, username, name, role, created_at, last_active_at,
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
    const { action, username, name, role, passcode, memberId } = body;
    const db = getDb();

    if (action === 'register') {
      const requiredPasscode = process.env.PROJECT_PASSCODE || 'NIDAR2026';
      if (!passcode || passcode.trim() !== requiredPasscode.trim()) {
        return NextResponse.json(
          { error: 'Invalid Project Passcode. Please get the access key from your team lead.' },
          { status: 401 }
        );
      }

      const rawUsername = (username || '').trim();
      const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_.-]/g, '');

      if (!cleanUsername || cleanUsername.length < 2) {
        return NextResponse.json(
          { error: 'Please choose a valid username (at least 2 letters, numbers, _ or -).' },
          { status: 400 }
        );
      }

      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
      }

      if (!role || !role.trim()) {
        return NextResponse.json({ error: 'Please enter your project role.' }, { status: 400 });
      }

      // Check if username is already taken
      const existing = db.prepare('SELECT id FROM members WHERE LOWER(username) = ? OR LOWER(id) = ?').get(cleanUsername, cleanUsername);
      if (existing) {
        return NextResponse.json(
          { error: `Username "@${cleanUsername}" is already taken. Please choose another username.` },
          { status: 409 }
        );
      }

      const id = generateMemberId(db);
      db.prepare(`
        INSERT INTO members (id, username, name, role, created_at, last_active_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(id, cleanUsername, name.trim(), role.trim());

      const member = db.prepare('SELECT id, username, name, role, created_at, last_active_at FROM members WHERE id = ?').get(id);
      return NextResponse.json({ success: true, member });
    }

    if (action === 'login') {
      const loginInput = (username || memberId || '').trim();
      if (!loginInput) {
        return NextResponse.json({ error: 'Please enter your username.' }, { status: 400 });
      }

      const cleanInput = loginInput.toLowerCase();
      // Match by username (case-insensitive), or ID, or full name
      const member = db.prepare(`
        SELECT id, username, name, role, created_at, last_active_at 
        FROM members 
        WHERE LOWER(username) = ? OR LOWER(id) = ? OR LOWER(name) = ?
      `).get(cleanInput, cleanInput, cleanInput);

      if (!member) {
        return NextResponse.json(
          { error: `User "${loginInput}" not found. If this is your first time, switch to "New Member" to register.` },
          { status: 404 }
        );
      }

      // Update last active
      db.prepare('UPDATE members SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(member.id);
      const updatedMember = db.prepare('SELECT id, username, name, role, created_at, last_active_at FROM members WHERE id = ?').get(member.id);

      return NextResponse.json({ success: true, member: updatedMember });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
