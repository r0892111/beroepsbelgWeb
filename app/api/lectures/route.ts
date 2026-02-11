import { NextResponse } from 'next/server';
import { getLectures } from '@/lib/api/content';

export async function GET() {
  try {
    const lectures = await getLectures();
    return NextResponse.json(lectures);
  } catch (error) {
    console.error('Error fetching lectures:', error);
    return NextResponse.json([], { status: 500 });
  }
}
