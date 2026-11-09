import { NextRequest, NextResponse } from 'next/server';
import { queryAll, execute } from '@/lib/db';

export async function GET() {
  try {
    // Fetch from categories table
    const explicitCategories = await queryAll<{ name: string }>('SELECT name FROM categories ORDER BY name ASC');
    
    // Also fetch any categories already used in logs or checklists
    const logCategories = await queryAll<{ name: string }>('SELECT DISTINCT category as name FROM progress_logs WHERE category IS NOT NULL');
    const checklistCategories = await queryAll<{ name: string }>('SELECT DISTINCT category as name FROM checklists WHERE category IS NOT NULL');

    const categorySet = new Set<string>();
    explicitCategories.forEach((c) => { if (c.name) categorySet.add(c.name.trim()); });
    logCategories.forEach((c) => { if (c.name) categorySet.add(c.name.trim()); });
    checklistCategories.forEach((c) => { if (c.name) categorySet.add(c.name.trim()); });

    const list = Array.from(categorySet);
    return NextResponse.json({ categories: list });
  } catch (error: any) {
    console.error('Failed to get categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Category name cannot be empty' }, { status: 400 });
    }

    await execute('INSERT OR IGNORE INTO categories (name) VALUES (?)', [name]);

    return NextResponse.json({ success: true, name });
  } catch (error: any) {
    console.error('Failed to add category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Category name required' }, { status: 400 });
    }

    await execute('DELETE FROM categories WHERE name = ?', [name]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
