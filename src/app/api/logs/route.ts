import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadsDir } from '@/lib/db';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const filterMember = searchParams.get('memberId');
    const filterCategory = searchParams.get('category');
    const searchQuery = searchParams.get('search');

    let query = `
      SELECT l.id, l.member_id, l.content, l.blockers, l.category, l.created_at, l.updated_at,
             m.name as member_name, m.role as member_role
      FROM progress_logs l
      JOIN members m ON l.member_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filterMember && filterMember !== 'ALL') {
      query += ` AND l.member_id = ?`;
      params.push(filterMember);
    }

    if (filterCategory && filterCategory !== 'ALL') {
      query += ` AND l.category = ?`;
      params.push(filterCategory);
    }

    if (searchQuery && searchQuery.trim()) {
      query += ` AND (l.content LIKE ? OR l.blockers LIKE ? OR m.name LIKE ?)`;
      const term = `%${searchQuery.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY l.created_at DESC`;

    const logs = db.prepare(query).all(...params);

    // Fetch attachments and reactions for these logs
    const logIds = logs.map((l: any) => l.id);
    const attachmentsMap: Record<number, any[]> = {};
    const reactionsMap: Record<number, any[]> = {};

    if (logIds.length > 0) {
      // In SQLite, we can fetch all attachments
      const placeholders = logIds.map(() => '?').join(',');
      const attachments = db.prepare(`
        SELECT id, log_id, file_url, file_name, file_size, mime_type, created_at
        FROM log_attachments
        WHERE log_id IN (${placeholders})
      `).all(...logIds);

      for (const att of attachments) {
        if (!attachmentsMap[att.log_id]) attachmentsMap[att.log_id] = [];
        attachmentsMap[att.log_id].push(att);
      }

      const reactions = db.prepare(`
        SELECT r.id, r.log_id, r.member_id, r.reaction_type, m.name as member_name
        FROM log_reactions r
        JOIN members m ON r.member_id = m.id
        WHERE r.log_id IN (${placeholders})
      `).all(...logIds);

      for (const rx of reactions) {
        if (!reactionsMap[rx.log_id]) reactionsMap[rx.log_id] = [];
        reactionsMap[rx.log_id].push(rx);
      }
    }

    const fullLogs = logs.map((l: any) => ({
      ...l,
      attachments: attachmentsMap[l.id] || [],
      reactions: reactionsMap[l.id] || [],
    }));

    return NextResponse.json({ logs: fullLogs });
  } catch (error: any) {
    console.error('Failed to get logs:', error);
    return NextResponse.json({ error: 'Failed to fetch progress logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const memberId = (formData.get('memberId') as string || '').trim().toUpperCase();
    const content = (formData.get('content') as string || '').trim();
    const blockers = (formData.get('blockers') as string || '').trim() || null;
    const category = (formData.get('category') as string || 'General').trim();

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required to post.' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'Log content cannot be empty.' }, { status: 400 });
    }

    const db = getDb();
    const member = db.prepare('SELECT id, name, role FROM members WHERE id = ?').get(memberId);
    if (!member) {
      return NextResponse.json({ error: 'Invalid Member ID. Please login again.' }, { status: 401 });
    }

    // Insert log
    const insertLog = db.prepare(`
      INSERT INTO progress_logs (member_id, content, blockers, category, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    const result = insertLog.run(memberId, content, blockers, category);
    
    // In node:sqlite, lastInsertRowid is available on the result
    const logId = Number(result.lastInsertRowid);

    // Update member's last active timestamp
    db.prepare('UPDATE members SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(memberId);

    // Process file attachments (screenshots)
    const files = formData.getAll('files') as File[];
    const uploadsDir = getUploadsDir();

    const savedAttachments: any[] = [];
    for (const file of files) {
      if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Clean filename
      const ext = path.extname(file.name || 'image.png').toLowerCase() || '.png';
      const cleanOriginalName = path.basename(file.name || 'screenshot.png').replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/api/uploads/${uniqueFilename}`;
      const insertAtt = db.prepare(`
        INSERT INTO log_attachments (log_id, file_url, file_name, file_size, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      insertAtt.run(logId, fileUrl, cleanOriginalName, file.size, file.type || 'image/png');

      savedAttachments.push({
        log_id: logId,
        file_url: fileUrl,
        file_name: cleanOriginalName,
        file_size: file.size,
        mime_type: file.type || 'image/png',
      });
    }

    const createdLog = {
      id: logId,
      member_id: member.id,
      member_name: member.name,
      member_role: member.role,
      content,
      blockers,
      category,
      created_at: new Date().toISOString(),
      attachments: savedAttachments,
      reactions: [],
    };

    return NextResponse.json({ success: true, log: createdLog });
  } catch (error: any) {
    console.error('Failed to post progress log:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit log update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const logId = searchParams.get('id');
    const memberId = (searchParams.get('memberId') || '').trim().toUpperCase();

    if (!logId || !memberId) {
      return NextResponse.json({ error: 'Missing log ID or member ID' }, { status: 400 });
    }

    const db = getDb();
    const log = db.prepare('SELECT id, member_id FROM progress_logs WHERE id = ?').get(logId);

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    if (log.member_id !== memberId) {
      return NextResponse.json({ error: 'You can only delete your own logs' }, { status: 403 });
    }

    // Delete attached files from disk
    const attachments = db.prepare('SELECT file_url FROM log_attachments WHERE log_id = ?').all(logId);
    for (const att of attachments) {
      const filename = path.basename(att.file_url);
      const filePath = path.join(getUploadsDir(), filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
    }

    db.prepare('DELETE FROM progress_logs WHERE id = ?').run(logId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete log:', error);
    return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
  }
}
