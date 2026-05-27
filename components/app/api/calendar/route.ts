import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://fxmacrodata.com/api/v1/calendar/usd', {
      next: { revalidate: 3600 }, // Cache the data for 1 hour to prevent spamming their API
    });

    if (!res.ok) {
      throw new Error(`FXMacroData API responded with status: ${res.status}`);
    }

    const data = await res.json();
    
    // Send the safe data back to our frontend component
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}