// ============================================================
// lib/market-hours.ts
// Used by SessionIntelligence to dim non-crypto session badges
// when forex/metals/indices markets are closed for the weekend.
// ============================================================

export type AssetClass = "crypto" | "forex" | "metal" | "index"

export function classifyAsset(symbol: string): AssetClass {
  const s = symbol.toUpperCase()
  if (s.includes("BTC") || s.includes("ETH") || s.includes("SOL") || s.includes("XBT")) return "crypto"
  if (s.includes("XAU") || s.includes("XAG") || s.includes("GOLD") || s.includes("SILVER")) return "metal"
  if (s.includes("USTEC") || s.includes("NAS") || s.includes("NDX") || s.includes("SPX") ||
      s.includes("DJI") || s.includes("DAX") || s.includes("FTSE")) return "index"
  return "forex"
}

/**
 * Crypto: always open.
 * Everything else: closed Fri 22:00 UTC → Sun 22:00 UTC.
 */
export function isMarketOpen(symbol: string, now: Date = new Date()): boolean {
  if (classifyAsset(symbol) === "crypto") return true
  const day = now.getUTCDay()
  const h   = now.getUTCHours()
  if (day === 6) return false                  // Saturday — all day closed
  if (day === 0 && h < 22) return false        // Sunday before 22 UTC
  if (day === 5 && h >= 22) return false       // Friday after 22 UTC
  return true
}

export function getMarketReopenTime(symbol: string, now: Date = new Date()): Date | null {
  if (isMarketOpen(symbol, now)) return null
  const day = now.getUTCDay()
  const reopen = new Date(now)
  reopen.setUTCHours(22, 0, 0, 0)
  if (day === 0) return reopen                                       // Sunday: today 22:00 UTC
  if (day === 6) { reopen.setUTCDate(reopen.getUTCDate() + 1); return reopen }   // Saturday: tomorrow
  if (day === 5 && now.getUTCHours() >= 22) {
    reopen.setUTCDate(reopen.getUTCDate() + 2); return reopen        // Friday late: +2 days
  }
  return null
}

export function formatTimeUntilOpen(reopenAt: Date, now: Date = new Date()): string {
  const diffMs = reopenAt.getTime() - now.getTime()
  if (diffMs <= 0) return "opening soon"
  const totalMin = Math.floor(diffMs / 60_000)
  const days = Math.floor(totalMin / (24 * 60))
  const hrs  = Math.floor((totalMin % (24 * 60)) / 60)
  const mins = totalMin % 60
  if (days > 0) return `${days}d ${hrs}h ${mins}m`
  if (hrs  > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}
