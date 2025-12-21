import { NextResponse } from 'next/server';
import { getCities } from '@/lib/api/content';

export async function GET() {
  try {
    const cities = await getCities();
    return NextResponse.json(cities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}

