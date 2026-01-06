import { NextRequest, NextResponse } from 'next/server';
import { getTours } from '@/lib/api/content';

// Force dynamic rendering to always fetch fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const citySlug = searchParams.get('city');
    
    const tours = await getTours(citySlug || undefined);
    return NextResponse.json(tours);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tours' },
      { status: 500 }
    );
  }
}

