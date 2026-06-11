"use client"

import { useState, useCallback, useEffect } from "react"
import {
  collection, query, where, getDocs, addDoc, deleteDoc,
  doc, orderBy, writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import {
  Upload, FileText, CheckCircle2, XCircle,
  ChevronDown, RefreshCw, Table2, Send, Trash2, History,
} from "lucide-react"

// ─── Broker format definitions ────────────────────────────────────────────────

const BROKER_FORMATS: Record<string, {
  label:      string
  headers:    string[]
  map:        (row: Record<string,string>) => ParsedTrade | null
}> = {
  tradingview: {
    label:   "TradingView",
    headers: ["trade #", "date/time", "type", "price", "contracts", "profit", "profit %"],
    map: row => {
      const type   = (row["type"] || "").toLowerCase()
      const profit = parseFloat(row["profit"] || "0")
      const price  = parseFloat(row["price"]  || "0")
      if(!type.includes("entry")) return null
      const dir = type.includes("long") ? "BUY" : "SELL"
      return {
        ticket:     row["trade #"] || String(Date.now()),
        symbol:     "UNKNOWN",
        direction:  dir,
        profit,
        openPrice:  price,
        closePrice: price,
        lots:       parseFloat(row["contracts"] || "1"),
        openedAt:   row["date/time"] || "",
        closedAt:   row["date/time"] || "",
      }
    },
  },
  exness: {
    label:   "Exness / MT5",
    headers: ["open time", "close time", "symbol", "type", "volume", "open price", "close price", "profit"],
    map: row => {
      const profit = parseFloat(row["profit"]      || "0")
      const type   = (row["type"] || "buy").toLowerCase()
      return {
        ticket:     row["ticket"] || row["order"] || String(Date.now() + Math.random()),
        symbol:     (row["symbol"] || "UNKNOWN").toUpperCase(),
        direction:  type.startsWith("buy") ? "BUY" : "SELL",
        profit,
        openPrice:  parseFloat(row["open price"]  || "0"),
        closePrice: parseFloat(row["close price"] || "0"),
        lots:       parseFloat(row["volume"]       || "0.01"),
        openedAt:   row["open time"]  || "",
        closedAt:   row["close time"] || "",
      }
    },
  },
  fusion: {
    label:   "Fusion Markets",
    headers: ["open time", "close time", "symbol", "type", "size", "open price", "close price", "profit"],
    map: row => {
      const profit = parseFloat(row["profit"] || "0")
      const type   = (row["type"] || "buy").toLowerCase()
      return {
        ticket:     row["ticket"] || row["order"] || String(Date.now() + Math.random()),
        symbol:     (row["symbol"] || "UNKNOWN").toUpperCase(),
        direction:  type.startsWith("buy") ? "BUY" : "SELL",
        profit,
        openPrice:  parseFloat(row["open price"]  || "0"),
        closePrice: parseFloat(row["close price"] || "0"),
        lots:       parseFloat(row["size"] || "0.01"),
        openedAt:   row["open time"]  || "",
        closedAt:   row["close time"] || "",
      }
    },
  },
  fusion_mt4: {
    label:   "Fusion Markets (MT4/MT5 History)",
    headers: ["order","type","symbol","size","open price","open time","close price","profit"],
    map: row => {
      const profit     = parseFloat(row["profit"]     || "0")
      const commission = parseFloat(row["commission"] || "0")
      const swap       = parseFloat(row["swap"]       || "0")
      const netPnl     = profit + commission + swap
      const rawSymbol  = (row["symbol"] || "UNKNOWN").replace(/Open$/i,"").toUpperCase()
      const type       = (row["type"] || "buy").toUpperCase()

      const parseDate = (raw: string): string => {
        if(!raw) return new Date().toISOString()
        try {
          const match = raw.match(/(\d+):(\d+)\s*(am|pm)\s+(\d+)\/(\d+)\/(\d+)/i)
          if(match) {
            let [,hh,mm,ampm,dd,mo,yy] = match
            let hours = parseInt(hh)
            if(ampm.toLowerCase()==="pm" && hours<12) hours+=12
            if(ampm.toLowerCase()==="am" && hours===12) hours=0
            return new Date(
              parseInt(yy), parseInt(mo)-1, parseInt(dd),
              hours, parseInt(mm)
            ).toISOString()
          }
        } catch{}
        return new Date().toISOString()
      }

      const openedAt = parseDate(row["open time"])
      return {
        ticket:     row["order"] || String(Date.now()+Math.random()),
        symbol:     rawSymbol,
        direction:  type === "BUY" ? "BUY" : "SELL",
        profit:     netPnl,
        openPrice:  parseFloat(row["open price"]  || "0"),
        closePrice: parseFloat(row["close price"] || "0"),
        lots:       parseFloat(row["size"]         || "0.01"),
        openedAt,
        closedAt:   openedAt,
      }
    },
  },
  generic: {
    label:   "Generic / Custom mapping",
    headers: [],
    map: () => null,
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedTrade {
  ticket:     string
  symbol:     string
  direction:  string
  profit:     number
  openPrice:  number
  closePrice: number
  lots:       number
  openedAt:   string
  closedAt:   string
}

interface Account {
  id:          string
  accountName: string
  color:       string
  broker:      string
}

interface ImportBatch {
  id:         string   // Firestore doc ID
  batchId:    string   // tag stored on each trade
  filename:   string
  accountId:  string
  format:     string
  importedAt: Date
  tradeCount: number
  totalPnl:   number
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let i = 0
  while(i <= line.length) {
    if(i === line.length) { result.push(""); break }
    if(line[i] === '"') {
      let val = ""; i++
      while(i < line.length) {
        if(line[i] === '"' && line[i+1] === '"') { val += '"'; i += 2 }
        else if(line[i] === '"') { i++; break }
        else { val += line[i++] }
      }
      result.push(val)
      if(line[i] === ',') i++
      else break
    } else {
      const end = line.indexOf(',', i)
      if(end === -1) { result.push(line.slice(i).trim()); break }
      result.push(line.slice(i, end).trim())
      i = end + 1
    }
  }
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
    .filter(l => l.trim() && !l.trim().startsWith("#"))
  if(lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
  return lines.slice(1)
    .map(line => {
      const vals = parseCSVLine(line)
      const row: Record<string,string> = {}
      headers.forEach((h, i) => { row[h] = (vals[i] ?? "").trim() })
      return row
    })
    .filter(r => Object.values(r).some(v => v.trim()))
}

function detectBroker(headers: string[]): string {
  const h = headers.map(h => h.toLowerCase())
  if(h.includes("order") && h.includes("size") && h.includes("duration")) return "fusion_mt4"
  for(const [key, fmt] of Object.entries(BROKER_FORMATS)) {
    if(key === "generic" || key === "fusion_mt4") continue
    const matched = fmt.headers.filter(fh => h.some(rh => rh.includes(fh))).length
    if(matched >= Math.floor(fmt.headers.length * 0.6)) return key
  }
  return "generic"
}

// ─── Webhook sender ───────────────────────────────────────────────────────────

async function sendTrade(
  trade:       ParsedTrade,
  accountId:   string,
  userId:      string,
  apiKey:      string,
  importBatch: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/webhook", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        ticket:      trade.ticket,
        symbol:      trade.symbol,
        profit:      trade.profit,
        type:        trade.direction,
        status:      "MANUAL_TRADE",
        userId,
        accountId,
        setup:       "CSV Import",
        source:      "CSV Import",
        openedAt:    trade.openedAt,
        closedAt:    trade.closedAt,
        openPrice:   trade.openPrice,
        closePrice:  trade.closePrice,
        lots:        trade.lots,
        timestamp:   Date.now(),
        importBatch,
      }),
    })
    return res.ok
  } catch { return false }
}

// ─── Generic column mapper ────────────────────────────────────────────────────

const REQUIRED_FIELDS = ["ticket","symbol","direction","profit","openedAt","closedAt"]
const OPTIONAL_FIELDS = ["openPrice","closePrice","lots"]

function GenericMapper({
  headers,
  onConfirm,
}: {
  headers:   string[]
  onConfirm: (mapping: Record<string,string>) => void
}) {
  const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]
  const [mapping, setMapping] = useState<Record<string,string>>(() => {
    const m: Record<string,string> = {}
    allFields.forEach(f => { m[f] = "" })
    return m
  })
  const ready = REQUIRED_FIELDS.every(f => mapping[f])

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
        Map your CSV columns to trade fields
      </p>
      <div className="grid grid-cols-2 gap-3">
        {allFields.map(field => (
          <div key={field}>
            <label className="block text-[9px] uppercase tracking-widest mb-1.5"
              style={{ color: REQUIRED_FIELDS.includes(field) ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
              {field} {REQUIRED_FIELDS.includes(field) ? "*" : ""}
            </label>
            <select
              value={mapping[field]}
              onChange={e => setMapping(p => ({...p, [field]: e.target.value}))}
              className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-xs text-foreground appearance-none focus:outline-none focus:border-foreground/25">
              <option value="" style={{background:"hsl(var(--card))"}}>— select column —</option>
              {headers.map(h => <option key={h} value={h} style={{background:"hsl(var(--card))"}}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>
      <button
        disabled={!ready}
        onClick={() => onConfirm(mapping)}
        className="px-5 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-30"
        style={{background:"linear-gradient(135deg,#a855f7,#6366f1)"}}>
        Apply Mapping
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CSVImportView() {
  const { user } = useAuth()

  // Accounts
  const [accounts,  setAccounts]  = useState<Account[]>([])
  const [accLoaded, setAccLoaded] = useState(false)

  // File / parse state
  const [file,         setFile]        = useState<File | null>(null)
  const [rawRows,      setRawRows]     = useState<Record<string,string>[]>([])
  const [csvHeaders,   setCsvHeaders]  = useState<string[]>([])
  const [detectedFmt,  setDetectedFmt] = useState("")
  const [selectedFmt,  setSelectedFmt] = useState("")
  const [parsedTrades, setParsedTrades]= useState<ParsedTrade[]>([])
  const [genericMap,   setGenericMap]  = useState<Record<string,string> | null>(null)
  const [step,         setStep]        = useState<"upload"|"preview"|"mapping"|"confirm"|"done">("upload")

  // Batch tagging — generated once per file pick
  const [batchId, setBatchId] = useState("")

  // Import state
  const [selectedAcc, setSelectedAcc] = useState("")
  const [importing,   setImporting]   = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [results,     setResults]     = useState<{ok:number; fail:number}>({ok:0,fail:0})

  // Import history
  const [importHistory, setImportHistory] = useState<ImportBatch[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null)
  const [showHistory,   setShowHistory]   = useState(false)

  // Load accounts
  const loadAccounts = useCallback(async () => {
    if(!user || accLoaded) return
    const q = query(collection(db,"accounts"), where("userId","==",user.uid))
    const snap = await getDocs(q)
    setAccounts(snap.docs.map(d => ({id:d.id,...d.data()} as Account)))
    setAccLoaded(true)
  }, [user, accLoaded])

  // Load import history from Firestore
  useEffect(() => {
    if(!user || historyLoaded) return
    const load = async () => {
      try {
        const q = query(
          collection(db, "importBatches"),
          where("userId", "==", user.uid),
          orderBy("importedAt", "desc")
        )
        const snap = await getDocs(q)
        setImportHistory(snap.docs.map(d => {
          const data = d.data()
          return {
            id:         d.id,
            batchId:    data.batchId    || "",
            filename:   data.filename   || "unknown.csv",
            accountId:  data.accountId  || "",
            format:     data.format     || "",
            importedAt: data.importedAt?.toDate?.() ?? new Date(),
            tradeCount: data.tradeCount || 0,
            totalPnl:   data.totalPnl   || 0,
          } as ImportBatch
        }))
      } catch(e) {
        console.error("Failed to load import history:", e)
      } finally {
        setHistoryLoaded(true)
      }
    }
    load()
  }, [user, historyLoaded])

  // Handle file drop / select
  const handleFile = useCallback((f: File) => {
    const bid = `csv_${Date.now()}`
    setBatchId(bid)
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      if(!rows.length) return
      const headers = Object.keys(rows[0])
      const detected = detectBroker(headers)
      setRawRows(rows)
      setCsvHeaders(headers)
      setDetectedFmt(detected)
      setSelectedFmt(detected)
      setStep("preview")
      loadAccounts()
    }
    reader.readAsText(f)
  }, [loadAccounts])

  // Parse rows → ParsedTrade[]
  const applyFormat = useCallback(() => {
    const fmt = BROKER_FORMATS[selectedFmt]
    if(!fmt) return
    if(selectedFmt === "generic" && !genericMap) { setStep("mapping"); return }
    const trades: ParsedTrade[] = []
    for(const row of rawRows) {
      let t: ParsedTrade | null = null
      if(selectedFmt === "generic" && genericMap) {
        t = {
          ticket:     row[genericMap.ticket]     || String(Date.now()+Math.random()),
          symbol:     (row[genericMap.symbol]    || "UNKNOWN").toUpperCase(),
          direction:  (row[genericMap.direction] || "BUY").toUpperCase().includes("BUY") ? "BUY" : "SELL",
          profit:     parseFloat(row[genericMap.profit]     || "0"),
          openPrice:  parseFloat(row[genericMap.openPrice]  || "0"),
          closePrice: parseFloat(row[genericMap.closePrice] || "0"),
          lots:       parseFloat(row[genericMap.lots]       || "0.01"),
          openedAt:   row[genericMap.openedAt]  || "",
          closedAt:   row[genericMap.closedAt]  || "",
        }
      } else {
        t = fmt.map(row)
      }
      if(t) trades.push(t)
    }
    setParsedTrades(trades)
    setStep("confirm")
  }, [selectedFmt, rawRows, genericMap])

  // Run the actual import
  const runImport = useCallback(async () => {
    if(!user || !selectedAcc || !parsedTrades.length) return
    setImporting(true)
    setProgress(0)
    let ok = 0, fail = 0
    for(let i = 0; i < parsedTrades.length; i++) {
      const success = await sendTrade(parsedTrades[i], selectedAcc, user.uid, "Kin6kizan4@", batchId)
      if(success) ok++; else fail++
      setProgress(Math.round(((i+1)/parsedTrades.length)*100))
      if(i % 10 === 9) await new Promise(r => setTimeout(r, 500))
    }

    // Save batch record to Firestore so history + undo work
    if(ok > 0) {
      try {
        const totalPnl = parsedTrades.reduce((s,t) => s + t.profit, 0)
        const ref = await addDoc(collection(db, "importBatches"), {
          batchId,
          userId:     user.uid,
          filename:   file?.name || "unknown.csv",
          accountId:  selectedAcc,
          format:     selectedFmt,
          importedAt: new Date(),
          tradeCount: ok,
          totalPnl,
        })
        // Optimistically add to local list
        setImportHistory(prev => [{
          id:         ref.id,
          batchId,
          filename:   file?.name || "unknown.csv",
          accountId:  selectedAcc,
          format:     selectedFmt,
          importedAt: new Date(),
          tradeCount: ok,
          totalPnl,
        }, ...prev])
      } catch(e) {
        console.error("Failed to save import batch record:", e)
      }
    }

    setResults({ok, fail})
    setImporting(false)
    setStep("done")
  }, [user, selectedAcc, parsedTrades, batchId, file, selectedFmt])

  // Undo an entire import batch
  const deleteBatch = useCallback(async (batch: ImportBatch) => {
    if(!confirm(
      `Undo import of "${batch.filename}"?\n\nThis permanently deletes all ${batch.tradeCount} trades from that import. This cannot be undone.`
    )) return
    setDeletingBatch(batch.id)
    try {
      // Query only this account's trades subcollection with the batch tag
      const tradesRef = collection(db, "accounts", batch.accountId, "trades")
      const q = query(tradesRef, where("importBatch", "==", batch.batchId))
      const snap = await getDocs(q)

      // Batch delete in chunks of 499 (Firestore limit)
      const allDocs = snap.docs
      for(let i = 0; i < allDocs.length; i += 499) {
        const wb = writeBatch(db)
        allDocs.slice(i, i + 499).forEach(d => wb.delete(d.ref))
        await wb.commit()
      }

      // Delete the importBatches record itself
      await deleteDoc(doc(db, "importBatches", batch.id))

      // Remove from local state
      setImportHistory(prev => prev.filter(b => b.id !== batch.id))
    } catch(e) {
      console.error("Failed to delete batch:", e)
      alert("Delete failed — check the console for details.")
    } finally {
      setDeletingBatch(null)
    }
  }, [])

  const reset = () => {
    setFile(null); setRawRows([]); setCsvHeaders([]); setDetectedFmt("")
    setSelectedFmt(""); setParsedTrades([]); setGenericMap(null)
    setStep("upload"); setProgress(0); setResults({ok:0,fail:0})
    setBatchId("")
  }

  const resolveAccountName = (accountId: string) =>
    accounts.find(a => a.id === accountId)?.accountName ?? accountId

  const brokerEntries = Object.entries(BROKER_FORMATS)

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
          <Table2 size={15} className="text-muted-foreground" />
          CSV Import
        </h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Import trade history from TradingView, Exness, Fusion Markets or any broker CSV
        </p>
      </div>

      {/* Supported brokers */}
      <div className="flex flex-wrap gap-2">
        {brokerEntries.map(([key, fmt]) => (
          <span key={key} className="text-[9px] font-bold px-2.5 py-1 rounded-full border border-border text-muted-foreground">
            {fmt.label}
          </span>
        ))}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === "upload" && (
        <label className="block cursor-pointer">
          <input type="file" accept=".csv" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="rounded-2xl border-2 border-dashed border-border bg-foreground/[0.02]
                          hover:border-foreground/20 hover:bg-foreground/[0.04] transition-all
                          flex flex-col items-center justify-center py-20 gap-4"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]) }}>
            <div className="w-14 h-14 rounded-2xl border border-border bg-foreground/[0.03] flex items-center justify-center">
              <Upload size={22} className="text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-foreground">Drop CSV file here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            </div>
            <p className="text-[10px] text-muted-foreground/60">Supports: TradingView · Exness · Fusion Markets · Generic</p>
          </div>
        </label>
      )}

      {/* ── STEP 2: Preview + format select ── */}
      {step === "preview" && rawRows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
            <div className="flex items-center gap-3">
              <FileText size={14} className="text-muted-foreground" />
              <div>
                <p className="text-xs font-bold text-foreground">{file?.name}</p>
                <p className="text-[10px] text-muted-foreground">{rawRows.length} rows · {csvHeaders.length} columns</p>
              </div>
            </div>
            <button onClick={reset} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Change file
            </button>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
              Detected format — confirm or change
            </label>
            <div className="flex flex-wrap gap-2">
              {brokerEntries.map(([key, fmt]) => (
                <button key={key} onClick={() => setSelectedFmt(key)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                  style={{
                    background:  selectedFmt===key ? "rgba(168,85,247,0.15)" : "rgba(127,127,127,0.04)",
                    borderColor: selectedFmt===key ? "rgba(168,85,247,0.5)"  : "hsl(var(--border))",
                    color:       selectedFmt===key ? "#a855f7" : "hsl(var(--muted-foreground))",
                  }}>
                  {fmt.label}
                  {key === detectedFmt && (
                    <span className="ml-1.5 text-[8px] opacity-60">auto-detected</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-foreground/[0.02]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Preview — first 5 rows</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    {csvHeaders.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0,5).map((row,i) => (
                    <tr key={i} className="border-b border-border/40">
                      {csvHeaders.map(h => (
                        <td key={h} className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[120px] truncate">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={applyFormat}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
            style={{background:"linear-gradient(135deg,#a855f7,#6366f1)", boxShadow:"0 0 20px rgba(168,85,247,0.3)"}}>
            Continue with {BROKER_FORMATS[selectedFmt]?.label || "selected format"}
          </button>
        </div>
      )}

      {/* ── STEP 2b: Generic mapping ── */}
      {step === "mapping" && (
        <div className="rounded-2xl border border-border bg-foreground/[0.02] p-5">
          <GenericMapper
            headers={csvHeaders}
            onConfirm={m => { setGenericMap(m); setSelectedFmt("generic"); setStep("preview") }}
          />
        </div>
      )}

      {/* ── STEP 3: Confirm + account select ── */}
      {step === "confirm" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"Trades parsed", value: parsedTrades.length, color:"text-foreground" },
              { label:"Total profit",  value: `$${parsedTrades.reduce((s,t)=>s+t.profit,0).toFixed(2)}`, color: parsedTrades.reduce((s,t)=>s+t.profit,0)>=0?"text-emerald-400":"text-rose-400" },
              { label:"Win rate",      value: `${parsedTrades.length>0?(parsedTrades.filter(t=>t.profit>0).length/parsedTrades.length*100).toFixed(0):0}%`, color:"text-foreground" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-foreground/[0.02]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Parsed trades preview — first 8</p>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border">
                  {["Symbol","Dir","Open","Close","P&L","Lots","Date"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] uppercase tracking-widest text-muted-foreground/70">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedTrades.slice(0,8).map((t,i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-3 py-2 font-bold text-foreground">{t.symbol}</td>
                    <td className="px-3 py-2">
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                        style={{background:t.direction==="BUY"?"rgba(52,211,153,0.15)":"rgba(248,113,113,0.15)",
                                color:t.direction==="BUY"?"#34d399":"#f87171"}}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{t.openPrice||"—"}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{t.closePrice||"—"}</td>
                    <td className="px-3 py-2 font-black" style={{color:t.profit>=0?"#34d399":"#f87171"}}>
                      {t.profit>=0?"+":""}${t.profit.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{t.lots}</td>
                    <td className="px-3 py-2 text-muted-foreground font-mono">{t.closedAt?.slice(0,10)||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Import into account *</label>
            {accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No accounts registered — add one in Lifetime Ledger first</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map(acc => (
                  <button key={acc.id} onClick={() => setSelectedAcc(acc.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all"
                    style={{
                      background:  selectedAcc===acc.id ? `${acc.color}18` : "rgba(127,127,127,0.04)",
                      borderColor: selectedAcc===acc.id ? `${acc.color}50` : "hsl(var(--border))",
                      color:       selectedAcc===acc.id ? acc.color         : "hsl(var(--muted-foreground))",
                    }}>
                    <span className="w-2 h-2 rounded-full" style={{background:acc.color}} />
                    {acc.accountName}
                    <span className="text-[9px] opacity-50">{acc.broker}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={reset}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground border border-border hover:bg-foreground/5 transition-all">
              Start over
            </button>
            <button onClick={runImport} disabled={!selectedAcc || importing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white transition-all disabled:opacity-30"
              style={{background:"linear-gradient(135deg,#a855f7,#6366f1)", boxShadow:"0 0 20px rgba(168,85,247,0.3)"}}>
              <Send size={13} />
              Import {parsedTrades.length} trades
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Progress ── */}
      {importing && (
        <div className="rounded-2xl border border-border bg-foreground/[0.02] p-8 text-center space-y-4">
          <RefreshCw size={24} className="animate-spin mx-auto text-purple-400" />
          <div>
            <p className="text-sm font-black text-foreground">Importing trades...</p>
            <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
          </div>
          <div className="h-1.5 rounded-full bg-foreground/5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{width:`${progress}%`, background:"linear-gradient(90deg,#a855f7,#6366f1)"}} />
          </div>
        </div>
      )}

      {/* ── STEP 5: Done ── */}
      {step === "done" && (
        <div className="rounded-2xl border border-border bg-foreground/[0.02] p-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={18} />
              <span className="text-lg font-black">{results.ok}</span>
              <span className="text-xs">imported</span>
            </div>
            {results.fail > 0 && (
              <div className="flex items-center gap-2 text-rose-400">
                <XCircle size={18} />
                <span className="text-lg font-black">{results.fail}</span>
                <span className="text-xs">failed</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Trades are in your Lifetime Ledger and P&L Calendar.
            If this was a mistake, open <strong className="text-foreground">Past Imports</strong> below and click <strong className="text-foreground">Undo import</strong>.
          </p>
          <button onClick={reset}
            className="px-5 py-2 rounded-xl text-xs font-black transition-all"
            style={{background:"linear-gradient(135deg,#a855f7,#6366f1)"}}>
            Import another file
          </button>
        </div>
      )}

      {/* ── Past Imports (always visible when not mid-flow) ── */}
      {!importing && step !== "mapping" && (
        <div className="space-y-3 pt-2 border-t border-border">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
            <History size={11} />
            Past Imports
            {importHistory.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                style={{background:"rgba(168,85,247,0.15)", color:"#a855f7"}}>
                {importHistory.length}
              </span>
            )}
            <ChevronDown size={10} className="transition-transform duration-200"
              style={{transform: showHistory ? "rotate(180deg)" : "rotate(0deg)"}} />
          </button>

          {showHistory && (
            !historyLoaded ? (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <RefreshCw size={11} className="animate-spin" /> Loading...
              </div>
            ) : importHistory.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/60 italic">No past imports yet.</p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border bg-foreground/[0.02]">
                      {["File","Account","Date","Trades","P&L",""].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[9px] uppercase tracking-widest text-muted-foreground/70">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importHistory.map(batch => (
                      <tr key={batch.id} className="border-b border-border/40 hover:bg-foreground/[0.02] transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <FileText size={11} className="text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground truncate max-w-[140px]">{batch.filename}</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5 ml-[19px] uppercase tracking-wider">{batch.format}</p>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{resolveAccountName(batch.accountId)}</td>
                        <td className="px-3 py-3 text-muted-foreground font-mono whitespace-nowrap">
                          {batch.importedAt instanceof Date ? batch.importedAt.toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-3 text-foreground font-bold">{batch.tradeCount}</td>
                        <td className="px-3 py-3 font-black"
                          style={{color: batch.totalPnl >= 0 ? "#34d399" : "#f87171"}}>
                          {batch.totalPnl >= 0 ? "+" : ""}${batch.totalPnl.toFixed(2)}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => deleteBatch(batch)}
                            disabled={deletingBatch === batch.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all disabled:opacity-40 whitespace-nowrap"
                            style={{
                              borderColor: "rgba(248,113,113,0.2)",
                              background:  "rgba(248,113,113,0.05)",
                              color:       "#f87171",
                            }}>
                            {deletingBatch === batch.id
                              ? <><RefreshCw size={9} className="animate-spin" /> Deleting...</>
                              : <><Trash2 size={9} /> Undo import</>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
