"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import {
  createChart, ColorType, CrosshairMode, CandlestickSeries, type IChartApi, type Time,
  type ISeriesApi, type CandlestickData,
} from "lightweight-charts"
import {
  TrendingUp, TrendingDown, Activity, Target, RefreshCw,
  AlertCircle, Calendar, ChevronRight, Sparkles, MousePointerClick,
} from "lucide-react"
import {
  type Candle, classifyCandle, calculateRSI, rsiContext,
  trendContext, macroRegime, getSessionAtTime, getKillZoneAtTime, levelProximity,
} from "@/lib/candle-analysis"

interface MarketLevels {
  pdh?: number; pdl?: number; pdc?: number
  pwh?: number; pwl?: number
  avwap?: number; poc?: number
}

const SYMBOLS = [
  { id: "XAUUSD", label: "🥇 XAU",   name: "Gold Spot",   decimals: 2 },
  { id: "USTEC",  label: "⚡ USTEC", name: "Nasdaq 100",  decimals: 2 },
  { id: "EURUSD", label: "💶 EUR",   name: "Fiber",       decimals: 5 },
  { id: "GBPUSD", label: "💷 GBP",   name: "Cable",       decimals: 5 },
  { id: "BTCUSD", label: "₿ BTC",    name: "Bitcoin",     decimals: 2 },
] as const

const TIMEFRAMES = [
  { id: "1h", label: "1H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D" },
] as const

function fmt(n: number, decimals = 2): string {
  if (!Number.isFinite(n) || n === 0) return "—"
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function CandleAnalysisView() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef          = useRef<IChartApi | null>(null)
  const seriesRef         = useRef<ISeriesApi<"Candlestick"> | null>(null)

  const [symbol,        setSymbol]        = useState<typeof SYMBOLS[number]["id"]>("XAUUSD")
  const [timeframe,     setTimeframe]     = useState<typeof TIMEFRAMES[number]["id"]>("1h")
  const [candles,       setCandles]       = useState<Candle[]>([])
  const [levels,        setLevels]        = useState<MarketLevels>({})
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [selectedIdx,   setSelectedIdx]   = useState<number | null>(null)

  const symbolMeta = SYMBOLS.find(s => s.id === symbol) ?? SYMBOLS[0]
  const decimals = symbolMeta.decimals

  // ── Fetch candles + market levels in parallel ─────────────
  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    setSelectedIdx(null)
    try {
      const qs = forceRefresh ? "&forceRefresh=true" : ""
      const [candleRes, mdRes] = await Promise.all([
        fetch(`/api/candles?symbol=${symbol}&timeframe=${timeframe}${qs}`),
        fetch(`/api/market-data?symbol=${symbol}`),
      ])
      const cData = await candleRes.json()
      if (!candleRes.ok || cData.error) throw new Error(cData.details ?? cData.error ?? "Candle fetch failed")
      setCandles(cData.candles ?? [])

      if (mdRes.ok) {
        const md = await mdRes.json()
        setLevels({
          pdh: md.pdh, pdl: md.pdl, pdc: md.pdc,
          pwh: md.pwh, pwl: md.pwl,
          avwap: md.avwap, poc: md.poc,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
      setCandles([])
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  useEffect(() => { fetchData(false) }, [fetchData])

  // ── RSI precomputed for all candles ─────────────────────
  const rsiSeries = useMemo(() => calculateRSI(candles, 14), [candles])

  // ── Initialize chart once ───────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return

    const container = chartContainerRef.current
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#000001" },
        textColor: "#94a3b8",
        fontFamily: "ui-sans-serif, system-ui, -apple-system",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.05)" },
        horzLines: { color: "rgba(148, 163, 184, 0.05)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#5fc77a", style: 3, width: 1, labelBackgroundColor: "#5fc77a" },
        horzLine: { color: "#5fc77a", style: 3, width: 1, labelBackgroundColor: "#5fc77a" },
      },
      rightPriceScale:  { borderColor: "rgba(148, 163, 184, 0.1)", scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale:        { borderColor: "rgba(148, 163, 184, 0.1)", timeVisible: true, secondsVisible: false },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor:        "#10b981",
      downColor:      "#f43f5e",
      borderUpColor:   "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor:    "#10b981",
      wickDownColor:  "#f43f5e",
    })

    chartRef.current = chart
    seriesRef.current = series

    // Click-to-select handler
    chart.subscribeClick(param => {
      if (!param.time || !param.point) return
      const timeNum = typeof param.time === "number" ? param.time : 0
      if (!timeNum) return
      setSelectedIdx(prev => {
        // Find index of candle whose `time` matches the clicked time
        const idx = candleTimeRef.current.findIndex(t => t === timeNum)
        return idx >= 0 ? idx : prev
      })
    })

    // Resize observer
    const ro = new ResizeObserver(entries => {
      if (entries[0] && chartRef.current) {
        const { width, height } = entries[0].contentRect
        chartRef.current.applyOptions({ width, height })
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // ref to keep candle times accessible in the click handler closure
  const candleTimeRef = useRef<number[]>([])
  useEffect(() => { candleTimeRef.current = candles.map(c => c.time) }, [candles])

  // ── Push candles to the chart whenever data changes ─────
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return
    const data: CandlestickData[] = candles.map(c => ({
      time: c.time as Time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }))
    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()
  }, [candles])

  // ── Selected candle analysis (memoized) ─────────────────
  const analysis = useMemo(() => {
    if (selectedIdx == null || !candles[selectedIdx]) return null
    const c = candles[selectedIdx]
    const body  = classifyCandle(c)
    const trend = trendContext(candles, selectedIdx)
    const macro = macroRegime(candles, selectedIdx, levels.avwap)
    const session   = getSessionAtTime(c.time)
    const killZone  = getKillZoneAtTime(c.time)
    const rsi = rsiSeries[selectedIdx] ?? 50
    const rsiCtx = rsiContext(rsi)
    return { candle: c, body, trend, macro, session, killZone, rsi, rsiCtx }
  }, [selectedIdx, candles, levels, rsiSeries])

  return (
    <div className="space-y-4">

      {/* ── Header: symbol + timeframe + refresh ─────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-card/60 shadow-lg">
        <div className="flex flex-wrap items-center gap-1 bg-background/40 p-1 rounded-lg border border-border/30">
          {SYMBOLS.map(s => (
            <button
              key={s.id}
              onClick={() => setSymbol(s.id)}
              className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                symbol === s.id
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-background/40 p-1 rounded-lg border border-border/30">
            {TIMEFRAMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  timeframe === t.id
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="p-2 rounded-lg bg-background/40 border border-border/30 hover:bg-white/[0.04] transition-colors disabled:opacity-50"
            aria-label="Refresh">
            <RefreshCw size={13} className={`text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Chart + Side panel grid ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">

        {/* Chart */}
        <div className="rounded-xl border border-border/40 bg-card/60 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-background/30">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                {symbolMeta.name}
              </span>
              <span className="text-[10px] text-muted-foreground/60">·</span>
              <span className="text-[10px] font-mono text-muted-foreground/80">{timeframe.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <MousePointerClick size={11} />
              <span className="hidden sm:inline italic">click any candle for context</span>
            </div>
          </div>
          <div
            ref={chartContainerRef}
            className="w-full"
            style={{ height: "560px", minHeight: 400 }}
          />
          {loading && candles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="rounded-xl border border-border/40 bg-card/60 shadow-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-background/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Candle Context
              </span>
            </div>
            {analysis && (
              <span className="text-[9px] font-mono text-muted-foreground/60">
                {new Date(analysis.candle.time * 1000).toUTCString().slice(0, -4)}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {error ? (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-rose-400">Failed to fetch</p>
                  <p className="text-[10px] text-rose-400/70 mt-0.5">{error}</p>
                </div>
              </div>
            ) : !analysis ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-3 text-muted-foreground/60">
                <MousePointerClick className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs italic">Click any candle on the chart to see what happened, RSI context, and macro regime.</p>
              </div>
            ) : (
              <>
                {/* OHLC */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Open",  val: analysis.candle.open,  color: "text-foreground" },
                    { label: "Close", val: analysis.candle.close,
                      color: analysis.candle.close >= analysis.candle.open ? "text-emerald-400" : "text-rose-400" },
                    { label: "High",  val: analysis.candle.high,  color: "text-emerald-400/80" },
                    { label: "Low",   val: analysis.candle.low,   color: "text-rose-400/80" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="px-2.5 py-1.5 rounded bg-background/40 border border-border/20">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                      <p className={`text-sm font-black tabular-nums ${color}`}>{fmt(val, decimals)}</p>
                    </div>
                  ))}
                </div>

                {/* WHAT HAPPENED */}
                <div className="rounded-lg bg-background/40 border border-border/20 overflow-hidden">
                  <div className="px-2.5 py-1.5 border-b border-border/20 bg-background/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">What Happened</p>
                  </div>
                  <div className="px-2.5 py-2 space-y-1.5">
                    <p className={`text-xs font-black ${
                      analysis.body.bias === "bull" ? "text-emerald-400" :
                      analysis.body.bias === "bear" ? "text-rose-400" : "text-amber-400"
                    }`}>
                      {analysis.body.type}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{analysis.body.explanation}</p>
                    <div className="pt-1.5 mt-1 border-t border-border/20">
                      <p className={`text-[10px] font-bold ${
                        analysis.trend.position === "continuation" ? "text-emerald-400" :
                        analysis.trend.position === "reversal" ? "text-amber-400" : "text-muted-foreground"
                      } uppercase tracking-wider`}>
                        {analysis.trend.position} · {analysis.trend.trend}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-0.5">
                        {analysis.trend.explanation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* TECHNICALS */}
                <div className="rounded-lg bg-background/40 border border-border/20 overflow-hidden">
                  <div className="px-2.5 py-1.5 border-b border-border/20 bg-background/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Technicals</p>
                  </div>
                  <div className="px-2.5 py-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground">RSI (14)</span>
                      <div className="text-right">
                        <span className="text-sm font-black tabular-nums text-foreground">{analysis.rsi.toFixed(1)}</span>
                        <span className={`ml-1.5 text-[10px] font-black ${analysis.rsiCtx.color}`}>· {analysis.rsiCtx.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground">Session</span>
                      <span className="text-[10px] font-black" style={{ color: analysis.session.color }}>{analysis.session.name}</span>
                    </div>
                    {analysis.killZone && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground">Kill Zone</span>
                        <span className="text-[10px] font-black text-amber-400">{analysis.killZone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DISTANCE TO LEVELS */}
                {(levels.pdh || levels.pdl || levels.pwh || levels.pwl) && (
                  <div className="rounded-lg bg-background/40 border border-border/20 overflow-hidden">
                    <div className="px-2.5 py-1.5 border-b border-border/20 bg-background/30">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Distance to Key Levels</p>
                    </div>
                    <div className="px-2.5 py-2 space-y-1">
                      {([
                        { label: "PDH", level: levels.pdh },
                        { label: "PDL", level: levels.pdl },
                        { label: "PWH", level: levels.pwh },
                        { label: "PWL", level: levels.pwl },
                      ] as const).filter(l => l.level && Number.isFinite(l.level)).map(l => {
                        const prox = levelProximity(analysis.candle.close, l.level as number)
                        return (
                          <div key={l.label} className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground">{l.label}</span>
                            <div className="text-right">
                              <span className="text-[10px] font-mono tabular-nums text-foreground">{fmt(l.level as number, decimals)}</span>
                              <span className={`ml-2 text-[10px] font-mono ${prox.relation === "above" ? "text-emerald-400/80" : prox.relation === "below" ? "text-rose-400/80" : "text-amber-400"}`}>
                                {prox.relation === "AT" ? "AT" : `${prox.percent >= 0 ? "+" : ""}${prox.percent.toFixed(2)}%`}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* MACRO CONTEXT */}
                <div className="rounded-lg bg-background/40 border border-border/20 overflow-hidden">
                  <div className="px-2.5 py-1.5 border-b border-border/20 bg-background/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Macro Context</p>
                  </div>
                  <div className="px-2.5 py-2 space-y-1">
                    <p className="text-xs font-black text-sky-400">{analysis.macro.regime}</p>
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed">{analysis.macro.detail}</p>
                  </div>
                </div>

                {/* LINK TO ECONOMIC CALENDAR */}
                <a
                  href="#economic-calendar"
                  onClick={(e) => {
                    e.preventDefault()
                    // Dispatch a custom event the parent page can listen for to switch tabs
                    window.dispatchEvent(new CustomEvent("phoenix:nav", { detail: "economic-calendar" }))
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 hover:bg-emerald-500/[0.1] transition-colors group">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      View Economic Events
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
