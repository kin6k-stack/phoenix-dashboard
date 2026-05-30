// ============================================================
// lib/market-hours.ts
// Helpers for determining whether a symbol's market is open right now.
// Used by SessionIntelligence to dim non-crypto session badges on weekends.
// ============================================================

export type AssetClass = "crypto" | "forex" | "metal" | "index"

/**
 * Classify a symbol by asset class.
 * Crypto is 24/7. Forex/metals/indices close on weekends.
 */
export function classifyAsset(symbol: string): AssetClass {
  const s = symbol.toUpperCase()
  if (s.includes("BTC") || s.includes("ETH") || s.includes("SOL") || s.includes("USDT") || s.includes("USDC")) return "crypto"
  if (s.includes("XAU") || s.includes("XAG") || s.includes("GOLD") || s.includes("SILVER")) return "metal"
  if (s.includes("USTEC") || s.includes("NAS") || s.includes("NDX") || s.includes("SPX") || s.includes("DJI") || s.includes("DAX") || s.includes("FTSE")) return "index"
  return "forex"  // default — EURUSD, GBPUSD, USDJPY, etc.
}

/**
 * Returns true if the symbol's market is open right now (UTC time).
 *
 * Crypto: always open
 * Everything else:
 *   - Closed: Friday 22:00 UTC → Sunday 22:00 UTC
 *   - Open:   the rest of the week
 *
 * Note: this is forex-standard hours. Stock index futures actually have a
 * brief daily maintenance break too, but that's not relevant for session
 * intelligence dashboarding — the weekend close is what matters here.
 */
export function isMarketOpen(symbol: string, now: Date = new Date()): boolean {
  if (classifyAsset(symbol) === "crypto") return true

  const day = now.getUTCDay()   // 0 = Sun, 6 = Sat
  const h   = now.getUTCHours()

  // Saturday — closed all day
  if (day === 6) return false
  // Sunday before 22:00 UTC — still closed
  if (day === 0 && h < 22) return false
  // Friday after 22:00 UTC — closed for weekend
  if (day === 5 && h >= 22) return false

  return true
}

/**
 * For closed markets, returns when the market re-opens (next Sunday 22:00 UTC).
 * Returns null for crypto (always open) or already-open markets.
 */
export function getMarketReopenTime(symbol: string, now: Date = new Date()): Date | null {
  if (isMarketOpen(symbol, now)) return null

  const day = now.getUTCDay()
  const reopen = new Date(now)
  reopen.setUTCHours(22, 0, 0, 0)

  if (day === 0) {
    // Sunday: reopen today at 22:00 UTC
    return reopen
  } else if (day === 6) {
    // Saturday: reopen tomorrow (Sunday) at 22:00 UTC
    reopen.setUTCDate(reopen.getUTCDate() + 1)
    return reopen
  } else if (day === 5 && now.getUTCHours() >= 22) {
    // Friday after close: reopen Sunday 22:00 UTC (2 days from now)
    reopen.setUTCDate(reopen.getUTCDate() + 2)
    return reopen
  }
  return null
}

/**
 * Formats time-until-reopen as a human-readable countdown.
 *   "1d 14h 22m" or "14h 22m" or "22m"
 */
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
