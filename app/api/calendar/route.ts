import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Institutional Macroeconomic Calendar Matrix
const CALENDAR_DATA = [
  // --- Peak Volatility Events (USD / XAU / USTEC Core Metrics) ---
  {
    id: "evt_001",
    time: "13:30",
    date: "2026-06-05", // Upcoming June NFP
    currency: "USD",
    event: "Non-Farm Employment Change (NFP)",
    importance: "HIGH",
    impactAsset: "XAUUSD / USTEC",
    previous: "175K",
    forecast: "165K",
    liveStatus: "UPCOMING"
  },
  {
    id: "evt_002",
    time: "13:30",
    date: "2026-06-10",
    currency: "USD",
    event: "Core CPI (MoM / YoY Inflation)",
    importance: "HIGH",
    impactAsset: "XAUUSD / USTEC",
    previous: "0.3%",
    forecast: "0.2%",
    liveStatus: "UPCOMING"
  },
  {
    id: "evt_003",
    time: "19:00",
    date: "2026-06-17",
    currency: "USD",
    event: "FOMC Economic Projections & Interest Rate Decision",
    importance: "HIGH",
    impactAsset: "GLOBAL DESK",
    previous: "5.50%",
    forecast: "5.25%",
    liveStatus: "UPCOMING"
  },
  {
    id: "evt_004",
    time: "13:30",
    date: "2026-06-25",
    currency: "USD",
    event: "Final GDP (QoQ Economic Growth)",
    importance: "HIGH",
    impactAsset: "USTEC / NASDAQ",
    previous: "1.6%",
    forecast: "1.8%",
    liveStatus: "UPCOMING"
  },
  {
    id: "evt_005",
    time: "13:30",
    date: "2026-07-03", // July NFP Window
    currency: "USD",
    event: "Non-Farm Employment Change (NFP)",
    importance: "HIGH",
    impactAsset: "XAUUSD / USTEC",
    previous: "165K",
    forecast: "155K",
    liveStatus: "UPCOMING"
  },
  {
    id: "evt_006",
    time: "13:30",
    date: "2026-07-14",
    currency: "USD",
    event: "Core Retail Sales (MoM Volume)",
    importance: "MEDIUM",
    impactAsset: "USD Index",
    previous: "0.2%",
    forecast: "0.3%",
    liveStatus: "UPCOMING"
  },
  {
    id: "evt_007",
    time: "14:00",
    date: "2026-07-29",
    currency: "USD",
    event: "FOMC Press Conference & Rate Statement",
    importance: "HIGH",
    impactAsset: "XAUUSD / USTEC",
    previous: "5.25%",
    forecast: "5.25%",
    liveStatus: "UPCOMING"
  },
  {
    id: "evt_008",
    time: "15:00",
    date: "2026-07-30",
    currency: "USD",
    event: "ISM Manufacturing PMI (Sector Health)",
    importance: "MEDIUM",
    impactAsset: "USTEC / NASDAQ",
    previous: "49.2",
    forecast: "50.1Live",
    liveStatus: "UPCOMING"
  }
];

export async function GET() {
  try {
    // Return sorted data to ensure chronological ordering across the 2-month threshold
    const sortedCalendar = CALENDAR_DATA.sort((a, b) => {
      return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
    });

    return NextResponse.json({ success: true, data: sortedCalendar }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal Telemetry Disconnection" }, { status: 500 });
  }
}