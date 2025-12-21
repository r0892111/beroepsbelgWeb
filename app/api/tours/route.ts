import { NextRequest, NextResponse } from 'next/server';
import { getTours } from '@/lib/api/content';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const citySlug = searchParams.get('city');
    
    const tours = await getTours(citySlug || undefined);
    return NextResponse.json(tours);
  } catch (error) {
    console.error('Error fetching tours:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tours' },
      { status: 500 }
    );
  }
}

