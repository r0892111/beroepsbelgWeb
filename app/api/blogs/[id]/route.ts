import { NextRequest, NextResponse } from 'next/server';
import { updateBlog, deleteBlog } from '@/lib/api/content';
import type { Blog } from '@/lib/data/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const blogData: Partial<Omit<Blog, 'id' | 'created_at' | 'updated_at' | 'blogImages'>> = await request.json();

    const updatedBlog = await updateBlog(id, blogData);
    if (!updatedBlog) {
      return NextResponse.json({ error: 'Blog not found.' }, { status: 404 });
    }

    return NextResponse.json(updatedBlog, { status: 200 });
  } catch (error: any) {
    console.error('Error updating blog:', error);
    return NextResponse.json({ error: 'Failed to update blog.', details: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await deleteBlog(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete blog.' }, { status: 500 });
  }
}

