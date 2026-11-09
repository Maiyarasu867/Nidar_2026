import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, execute } from '@/lib/db';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterMember = searchParams.get('memberId');
    const filterCategory = searchParams.get('category');
    const searchQuery = searchParams.get('search');

    let query = `
      SELECT l.id, l.member_id, l.content, l.blockers, l.category, l.created_at, l.updated_at,
             m.name as member_name, m.role as member_role, m.username as member_username
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
      query += ` AND (l.content LIKE ? OR l.blockers LIKE ? OR m.name LIKE ? OR m.username LIKE ?)`;
      const term = `%${searchQuery.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY l.created_at DESC`;

    const logs = await queryAll(query, params);

    // Fetch attachments and reactions for these logs
    const logIds = logs.map((l: any) => l.id);
    const attachmentsMap: Record<number, any[]> = {};
    const reactionsMap: Record<number, any[]> = {};

    if (logIds.length > 0) {
      const placeholders = logIds.map(() => '?').join(',');
      const attachments = await queryAll(`
        SELECT id, log_id, file_url, file_name, file_size, mime_type, note, created_at
        FROM log_attachments
        WHERE log_id IN (${placeholders})
      `, logIds);

      for (const att of attachments) {
        if (!attachmentsMap[att.log_id]) attachmentsMap[att.log_id] = [];
        attachmentsMap[att.log_id].push(att);
      }

      const reactions = await queryAll(`
        SELECT r.id, r.log_id, r.member_id, r.reaction_type, m.name as member_name
        FROM log_reactions r
        JOIN members m ON r.member_id = m.id
        WHERE r.log_id IN (${placeholders})
      `, logIds);

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
    const memberId = (formData.get('memberId') as string || '').trim();
    const content = (formData.get('content') as string || '').trim();
    const blockers = (formData.get('blockers') as string || '').trim() || null;
    const category = (formData.get('category') as string || 'General').trim();

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required to post.' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'Log content cannot be empty.' }, { status: 400 });
    }

    const member = await queryOne('SELECT id, username, name, role FROM members WHERE id = ?', [memberId]);
    if (!member) {
      return NextResponse.json({ error: 'Member not found. Please log in again.' }, { status: 404 });
    }

    // Insert log
    const logRes = await execute(`
      INSERT INTO progress_logs (member_id, content, blockers, category, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [memberId, content, blockers, category]);
    
    const logId = logRes.lastInsertRowid;

    // Update member's last active timestamp
    await execute('UPDATE members SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?', [memberId]);

    // Process file attachments (screenshots)
    const files = formData.getAll('files') as File[];
    const notes = formData.getAll('notes') as string[];
    const savedAttachments: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = file.type || 'image/png';
      const cleanOriginalName = path.basename(file.name || 'screenshot.png').replace(/[^a-zA-Z0-9._-]/g, '_');
      const note = (notes[i] || '').trim() || null;

      // Store as Base64 Data URL for persistent in-database storage across cloud restarts
      const base64Data = buffer.toString('base64');
      const fileUrl = `data:${mimeType};base64,${base64Data}`;

      const attRes = await execute(`
        INSERT INTO log_attachments (log_id, file_url, file_name, file_size, mime_type, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [logId, fileUrl, cleanOriginalName, file.size, mimeType, note]);

      savedAttachments.push({
        id: attRes.lastInsertRowid,
        log_id: logId,
        file_url: fileUrl,
        file_name: cleanOriginalName,
        note,
        file_size: file.size,
        mime_type: mimeType,
      });
    }

    const createdLog = {
      id: logId,
      member_id: member.id,
      member_username: member.username,
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
    const memberId = (searchParams.get('memberId') || '').trim();

    if (!logId || !memberId) {
      return NextResponse.json({ error: 'Missing log ID or member ID' }, { status: 400 });
    }

    const log = await queryOne<{ id: number; member_id: string }>('SELECT id, member_id FROM progress_logs WHERE id = ?', [logId]);

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    if (log.member_id !== memberId) {
      return NextResponse.json({ error: 'You can only delete your own logs' }, { status: 403 });
    }

    await execute('DELETE FROM progress_logs WHERE id = ?', [logId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete log:', error);
    return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
  }
}
