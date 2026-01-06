import { NextResponse } from 'next/server';
import { getCities } from '@/lib/api/content';

// Force dynamic rendering to always fetch fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const cities = await getCities();
    return NextResponse.json(cities);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}

