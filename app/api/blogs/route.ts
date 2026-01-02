import { NextRequest, NextResponse } from 'next/server';
import { getAllBlogs, createBlog } from '@/lib/api/content';
import type { Blog } from '@/lib/data/types';

export async function GET() {
  try {
    const blogs = await getAllBlogs();
    return NextResponse.json(blogs, { status: 200 });
  } catch (error: any) {
    console.error('API Error fetching blogs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch blogs.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const blogData: Omit<Blog, 'id' | 'created_at' | 'updated_at' | 'blogImages'> = await request.json();

    if (!blogData.title || !blogData.content) {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    const newBlog = await createBlog(blogData);
    return NextResponse.json(newBlog, { status: 201 });
  } catch (error: any) {
    console.error('API Error creating blog:', error);
    return NextResponse.json({ error: error.message || 'Failed to create blog.' }, { status: 500 });
  }
}

