// /api/market/trump
import { NextRequest, NextResponse } from "next/server";
import { MOCK_TRUMP_POSTS } from "@/lib/mock-data";
import type { TrumpPolicyCategory } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as TrumpPolicyCategory | null;
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  let data = [...MOCK_TRUMP_POSTS];
  if (category) data = data.filter((p) => p.policyCategory === category);
  data = data.slice(0, limit).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Compute theme counts
  const themeCounts: Record<string, number> = {};
  for (const post of MOCK_TRUMP_POSTS) {
    themeCounts[post.policyCategory] = (themeCounts[post.policyCategory] ?? 0) + 1;
  }

  const avgImpact =
    MOCK_TRUMP_POSTS.length > 0
      ? Math.round(
          (MOCK_TRUMP_POSTS.reduce((s, p) => s + p.impactScore, 0) / MOCK_TRUMP_POSTS.length) * 10
        ) / 10
      : 5;

  return NextResponse.json({
    data,
    meta: {
      avgImpact,
      themeCounts,
      totalPosts: MOCK_TRUMP_POSTS.length,
    },
    timestamp: new Date().toISOString(),
  });
}
