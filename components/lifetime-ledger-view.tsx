"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, doc, query, where, orderBy, getDocs, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, Wallet, BarChart2, ChevronRight, X, Check, Building2, RefreshCw } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Account {
  id:           string
  userId:       string
  accountName:  string
  broker:       string
  login:        string
  instruments:  string[]
  color:        string
  currency:     string
  createdAt:    Date
  isActive:     boolean
}

interface AccountStats {
  totalPnl:   number
  winRate:    number
  tradeCount: number
  wins:       number
  losses:     number
  loaded:     boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BROKERS = ["Exness", "Fusion Markets"]

const ACCOUNT_COLORS = [
  "#a855f7", // purple
  "#34d399", // emerald
  "#60a5fa", // blue
  "#f59e0b", // amber
  "#f472b6", // pink
  "#2dd4bf", // teal
  "#fb923c", // orange
  "#a3e635", // lime
  "#e879f9", // fuchsia
  "#38bdf8", // sky
]

const INSTRUMENTS = ["XAUUSD (Gold)", "USTEC (NQ)", "Forex", "Indices", "Crypto", "Other"]

// ─── Account Registration Dialog ─────────────────────────────────────────────

function AccountDialog({
  existing,
  brokers,
  onSave,
  onClose,
}: {
  existing?: Account | null
  brokers:   string[]
  onSave:    (data: Omit<Account, "id" | "userId" | "createdAt">) => void
  onClose:   () => void
}) {
  const [name,        setName]        = useState(existing?.accountName  ?? "")
  const [broker,      setBroker]      = useState(existing?.broker       ?? brokers[0])
  const [customBroker,setCustomBroker]= useState("")
  const [addingBroker,setAddingBroker]= useState(false)
  const [login,       setLogin]       = useState(existing?.login        ?? "")
  const [instruments, setInstruments] = useState<string[]>(existing?.instruments ?? [])
  const [color,       setColor]       = useState(existing?.color        ?? ACCOUNT_COLORS[0])
  const [currency,    setCurrency]    = useState(existing?.currency     ?? "USD")
  const [error,       setError]       = useState("")

  const toggleInstrument = (inst: string) =>
    setInstruments(prev => prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst])

  const handleSave = () => {
    if(!name.trim())    { setError("Account name is required"); return }
    if(!login.trim())   { setError("Login number is required");  return }
    if(instruments.length === 0) { setError("Select at least one instrument"); return }
    onSave({
      accountName: name.trim(),
      broker:      addingBroker && customBroker.trim() ? customBroker.trim() : broker,
      login:       login.trim(),
      instruments,
      color,
      currency,
      isActive: true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg,#0f0f12,#16161e)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">
              {existing ? "Edit Account" : "Register Account"}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">Add a trading account to your lifetime ledger</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-5">

          {/* Account Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Account Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Exness Gold Scalper"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          {/* Broker + Login row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Broker</label>
              {addingBroker ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={customBroker}
                    onChange={e => setCustomBroker(e.target.value)}
                    placeholder="Broker name"
                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25"
                  />
                  <button onClick={() => { if(customBroker.trim()) setBroker(customBroker.trim()); setAddingBroker(false) }}
                    className="px-3 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-colors">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <select
                  value={broker}
                  onChange={e => { if(e.target.value === "__new__") setAddingBroker(true); else setBroker(e.target.value) }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors appearance-none"
                >
                  {brokers.map(b => <option key={b} value={b} style={{ background:"#16161e" }}>{b}</option>)}
                  <option value="__new__" style={{ background:"#16161e" }}>+ Add broker...</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Login Number</label>
              <input
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="e.g. 198440704"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>
          </div>

          {/* Instruments */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Instruments Traded</label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map(inst => (
                <button
                  key={inst}
                  onClick={() => toggleInstrument(inst)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                  style={{
                    background:   instruments.includes(inst) ? `${color}22` : "rgba(255,255,255,0.04)",
                    borderColor:  instruments.includes(inst) ? color         : "rgba(255,255,255,0.08)",
                    color:        instruments.includes(inst) ? color         : "rgba(255,255,255,0.4)",
                  }}
                >{inst}</button>
              ))}
            </div>
          </div>

          {/* Color + Currency row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Account Color</label>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full transition-all border-2"
                    style={{
                      background:   c,
                      borderColor:  color === c ? "white" : "transparent",
                      transform:    color === c ? "scale(1.2)" : "scale(1)",
                      boxShadow:    color === c ? `0 0 8px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors appearance-none"
              >
                {["USD","EUR","GBP","AUD","CAD"].map(c => (
                  <option key={c} value={c} style={{ background:"#16161e" }}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white/50 hover:text-white hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-black text-black transition-all hover:opacity-90 active:scale-95"
            style={{ background: color, boxShadow: `0 0 16px ${color}66` }}>
            {existing ? "Save Changes" : "Register Account"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  stats,
  selected,
  onClick,
  onEdit,
  onDelete,
}: {
  account:  Account
  stats:    AccountStats
  selected:  boolean
  onClick:   () => void
  onEdit:    () => void
  onDelete:  () => void
  onClear:   () => void
}) {
  const pnlPos = stats.totalPnl >= 0

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 group"
      style={{
        background:   selected ? `${account.color}14` : "rgba(255,255,255,0.03)",
        borderColor:  selected ? `${account.color}60` : "rgba(255,255,255,0.07)",
        boxShadow:    selected ? `0 0 24px ${account.color}22` : "none",
      }}>

      {/* Color bar */}
      <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full opacity-60 transition-opacity group-hover:opacity-100"
        style={{ background: account.color }} />

      {/* Actions */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); onEdit() }}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
          <Edit2 size={11} />
        </button>
        <button onClick={e => { e.stopPropagation(); onClear() }}
          title="Delete all trades for this account"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/40 hover:text-amber-400 transition-colors">
          <RefreshCw size={11} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors">
          <Trash2 size={11} />
        </button>
      </div>

      {/* Account identity */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${account.color}20`, border: `1px solid ${account.color}40` }}>
          <Building2 size={14} style={{ color: account.color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-white truncate">{account.accountName}</p>
          <p className="text-[10px] text-white/40 truncate">{account.broker} · {account.login}</p>
          {/* Account ID — user copies this into InpAccountId in MT5 sync script */}
          <p className="text-[9px] font-mono text-white/20 truncate mt-0.5"
            title="Copy this into InpAccountId in the MT5 sync script">
            ID: {account.id}
          </p>
        </div>
      </div>

      {/* P&L */}
      {!stats.loaded ? (
        <div className="flex items-center gap-1.5 text-white/30">
          <RefreshCw size={10} className="animate-spin" />
          <span className="text-[10px]">Loading...</span>
        </div>
      ) : stats.tradeCount === 0 ? (
        <p className="text-[10px] text-white/25 italic">No trades synced yet</p>
      ) : (
        <div>
          <div className="flex items-baseline gap-1.5">
            {pnlPos
              ? <TrendingUp size={12} style={{ color: account.color }} />
              : <TrendingDown size={12} className="text-rose-400" />}
            <span className="text-base font-black" style={{ color: pnlPos ? account.color : "#f87171" }}>
              {pnlPos ? "+" : ""}${stats.totalPnl.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-3 mt-1.5">
            <span className="text-[10px] text-white/40">{stats.tradeCount} trades</span>
            <span className="text-[10px]" style={{ color: account.color }}>{stats.winRate.toFixed(0)}% WR</span>
          </div>
        </div>
      )}

      {/* Instruments */}
      <div className="flex flex-wrap gap-1 mt-3">
        {account.instruments.map(inst => (
          <span key={inst} className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
            style={{ background: `${account.color}18`, color: `${account.color}cc` }}>
            {inst.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Combined Stats Bar ───────────────────────────────────────────────────────

function CombinedStats({ accounts, statsMap }: { accounts: Account[], statsMap: Map<string, AccountStats> }) {
  const totals = useMemo(() => {
    let pnl = 0, trades = 0, wins = 0, losses = 0
    for(const a of accounts) {
      const s = statsMap.get(a.id)
      if(!s?.loaded) continue
      pnl    += s.totalPnl
      trades += s.tradeCount
      wins   += s.wins
      losses += s.losses
    }
    return { pnl, trades, wins, losses, wr: trades > 0 ? (wins/trades)*100 : 0 }
  }, [accounts, statsMap])

  const tiles = [
    { label: "Total P&L",     value: `${totals.pnl >= 0 ? "+" : ""}$${totals.pnl.toFixed(2)}`, color: totals.pnl >= 0 ? "#34d399" : "#f87171" },
    { label: "Total Trades",  value: String(totals.trades), color: "#e5e7eb" },
    { label: "Total Wins",    value: String(totals.wins),   color: "#34d399" },
    { label: "Total Losses",  value: String(totals.losses), color: "#f87171" },
    { label: "Combined WR",   value: `${totals.wr.toFixed(1)}%`, color: totals.wr >= 50 ? "#34d399" : "#f87171" },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {tiles.map(t => (
        <div key={t.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">{t.label}</p>
          <p className="text-lg font-black" style={{ color: t.color }}>{t.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Account Breakdown Table ──────────────────────────────────────────────────

function AccountTable({ accounts, statsMap, onSelect }: {
  accounts:  Account[]
  statsMap:  Map<string, AccountStats>
  onSelect:  (a: Account) => void
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
        <BarChart2 size={13} className="text-white/40" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Account Breakdown</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {["Account","Broker","Login","Instruments","Trades","Win Rate","P&L",""].map(h => (
              <th key={h} className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-white/25">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map(a => {
            const s = statsMap.get(a.id)
            const pnlPos = (s?.totalPnl ?? 0) >= 0
            return (
              <tr key={a.id} onClick={() => onSelect(a)}
                className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }} />
                    <span className="text-xs font-bold text-white">{a.accountName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-white/50">{a.broker}</td>
                <td className="px-4 py-3">
                  <p className="text-xs font-mono text-white/40">{a.login}</p>
                  <p className="text-[9px] font-mono text-white/20" title="InpAccountId for MT5 sync script">{a.id}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {a.instruments.map(i => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                        style={{ background:`${a.color}18`, color:`${a.color}cc` }}>
                        {i.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-white/50">{s?.loaded ? s.tradeCount : "—"}</td>
                <td className="px-4 py-3 text-xs font-bold" style={{ color: s?.loaded && s.wr > 0 ? "#34d399" : "#f87171" }}>
                  {s?.loaded ? `${s.winRate.toFixed(0)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-sm font-black"
                  style={{ color: s?.loaded ? (pnlPos ? "#34d399" : "#f87171") : "rgba(255,255,255,0.2)" }}>
                  {s?.loaded && s.tradeCount > 0
                    ? `${pnlPos ? "+" : ""}$${s.totalPnl.toFixed(2)}`
                    : <span className="text-[10px] text-white/20 italic">Sync trades</span>}
                </td>
                <td className="px-4 py-3">
                  <ChevronRight size={12} className="text-white/20 group-hover:text-white/50 transition-colors" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {accounts.length === 0 && (
        <div className="px-4 py-10 text-center text-white/25 text-sm">
          No accounts registered yet — click <strong>Add Account</strong> to get started
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LifetimeLedgerView() {
  const { user } = useAuth()
  const [accounts,    setAccounts]    = useState<Account[]>([])
  const [statsMap,    setStatsMap]    = useState<Map<string, AccountStats>>(new Map())
  const [brokers,     setBrokers]     = useState<string[]>(DEFAULT_BROKERS)
  const [selectedAcc, setSelectedAcc] = useState<Account | null>(null)
  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [editTarget,  setEditTarget]  = useState<Account | null>(null)

  // Listen to accounts collection
  useEffect(() => {
    if(!user) return
    const q = query(collection(db, "accounts"), where("userId", "==", user.uid))
    return onSnapshot(q, snap => {
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Account[]
      setAccounts(accs)
      // Collect custom brokers
      const allBrokers = [...new Set([...DEFAULT_BROKERS, ...accs.map(a => a.broker)])]
      setBrokers(allBrokers)
    })
  }, [user])

  // Load stats per account from trades subcollection
  useEffect(() => {
    if(!user || accounts.length === 0) return
    const newMap = new Map<string, AccountStats>()

    Promise.all(accounts.map(async acc => {
      try {
        // Subcollection path: accounts/{accountId}/trades
        const q = collection(db, "accounts", acc.id, "trades")
        const snap = await getDocs(q)
        let pnl = 0, wins = 0, losses = 0
        snap.forEach(d => {
          const data = d.data()
          const profit = data.rMultiple ?? data.profit ?? 0
          pnl += Number(profit)
          if(profit > 0) wins++
          else if(profit < 0) losses++
        })
        newMap.set(acc.id, {
          totalPnl:   pnl,
          winRate:    snap.size > 0 ? (wins/snap.size)*100 : 0,
          tradeCount: snap.size,
          wins, losses,
          loaded: true,
        })
      } catch {
        newMap.set(acc.id, { totalPnl:0, winRate:0, tradeCount:0, wins:0, losses:0, loaded:true })
      }
    })).then(() => setStatsMap(new Map(newMap)))
  }, [user, accounts])

  const handleSave = async (data: Omit<Account, "id" | "userId" | "createdAt">) => {
    if(!user) return
    if(editTarget) {
      await updateDoc(doc(db, "accounts", editTarget.id), { ...data })
    } else {
      // Deterministic ID: broker_slug_login — e.g. "exness_198440704"
      // This is what the MT5 sync script needs to type in as InpAccountId
      const slug = data.broker.toLowerCase().replace(/[^a-z0-9]/g, "_")
      const accountId = `${slug}_${data.login}`
      await setDoc(doc(db, "accounts", accountId), {
        ...data,
        userId:    user.uid,
        createdAt: new Date(),
      })
    }
    setDialogOpen(false)
    setEditTarget(null)
  }

  const handleClearTrades = async (acc: Account) => {
    if(!confirm(`Delete ALL trades for "${acc.accountName}"?

This removes every trade in accounts/${acc.id}/trades/
The account registration stays. This cannot be undone.`)) return
    try {
      const tradesRef = collection(db, "accounts", acc.id, "trades")
      const snap = await getDocs(tradesRef)
      if(snap.empty) { alert("No trades to delete."); return }
      // Batch delete in chunks of 500
      const chunks: any[][] = []
      const docs = snap.docs
      for(let i = 0; i < docs.length; i += 499) chunks.push(docs.slice(i, i+499))
      for(const chunk of chunks) {
        const batch = writeBatch(db)
        chunk.forEach(d => batch.delete(d.ref))
        await batch.commit()
      }
      // Refresh stats
      setStatsMap(prev => {
        const m = new Map(prev)
        m.set(acc.id, { totalPnl:0, winRate:0, tradeCount:0, wins:0, losses:0, loaded:true })
        return m
      })
      alert(`Deleted ${snap.size} trades from ${acc.accountName}.`)
    } catch(err) {
      console.error("Clear trades failed:", err)
      alert("Delete failed — check console for details.")
    }
  }

  const handleDelete = async (acc: Account) => {
    if(!confirm(`Remove "${acc.accountName}"? Synced trades are not deleted.`)) return
    await deleteDoc(doc(db, "accounts", acc.id))
    if(selectedAcc?.id === acc.id) setSelectedAcc(null)
  }

  return (
    <div className="space-y-5 p-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Wallet size={15} className="text-muted-foreground" />
            Lifetime Ledger
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {accounts.length} account{accounts.length !== 1 ? "s" : ""} registered
            {accounts.length > 0 ? ` across ${[...new Set(accounts.map(a => a.broker))].length} broker${[...new Set(accounts.map(a => a.broker))].length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setDialogOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all hover:opacity-90 active:scale-95"
          style={{ background:"linear-gradient(135deg,#a855f7,#6366f1)", boxShadow:"0 0 20px rgba(168,85,247,0.3)" }}>
          <Plus size={13} />
          Add Account
        </button>
      </div>

      {accounts.length > 0 && (
        <>
          {/* Combined stats */}
          <CombinedStats accounts={accounts} statsMap={statsMap} />

          {/* Account cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {accounts.map(acc => (
              <AccountCard
                key={acc.id}
                account={acc}
                stats={statsMap.get(acc.id) ?? { totalPnl:0, winRate:0, tradeCount:0, wins:0, losses:0, loaded:false }}
                selected={selectedAcc?.id === acc.id}
                onClick={() => setSelectedAcc(prev => prev?.id === acc.id ? null : acc)}
                onEdit={() => { setEditTarget(acc); setDialogOpen(true) }}
                onDelete={() => handleDelete(acc)}
              />
            ))}
          </div>

          {/* Breakdown table */}
          <AccountTable
            accounts={accounts}
            statsMap={statsMap}
            onSelect={acc => setSelectedAcc(prev => prev?.id === acc.id ? null : acc)}
          />
        </>
      )}

      {accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center mb-4">
            <Wallet size={24} className="text-white/20" />
          </div>
          <p className="text-sm font-black text-white/30 uppercase tracking-widest">No accounts yet</p>
          <p className="text-xs text-white/20 mt-1 max-w-xs">
            Register your trading accounts to start tracking lifetime P&L across all brokers
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all hover:opacity-90"
            style={{ background:"linear-gradient(135deg,#a855f7,#6366f1)", boxShadow:"0 0 20px rgba(168,85,247,0.3)" }}>
            <Plus size={13} />
            Register First Account
          </button>
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <AccountDialog
          existing={editTarget}
          brokers={brokers}
          onSave={handleSave}
          onClose={() => { setDialogOpen(false); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
