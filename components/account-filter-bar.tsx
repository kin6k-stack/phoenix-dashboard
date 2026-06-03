"use client"

// AccountFilterBar — shown above P&L Calendar and Analytics
// Lets user filter trades by registered account or see all

interface Account {
  id:          string
  accountName: string
  color:       string
  broker:      string
}

interface Props {
  accounts:          Account[]
  selectedAccountId: string | null
  onSelect:          (id: string | null) => void
}

export function AccountFilterBar({ accounts, selectedAccountId, onSelect }: Props) {
  if (accounts.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap px-1 pb-1">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mr-1">
        Account
      </span>

      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className="px-3 py-1 rounded-full text-[10px] font-bold transition-all border"
        style={{
          background:  selectedAccountId === null ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
          borderColor: selectedAccountId === null ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.07)",
          color:       selectedAccountId === null ? "white" : "rgba(255,255,255,0.35)",
        }}>
        All
      </button>

      {/* Per account */}
      {accounts.map(acc => {
        const active = selectedAccountId === acc.id
        return (
          <button
            key={acc.id}
            onClick={() => onSelect(active ? null : acc.id)}
            title={`${acc.broker} · ${acc.id}`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border"
            style={{
              background:  active ? `${acc.color}22` : "rgba(255,255,255,0.03)",
              borderColor: active ? `${acc.color}60` : "rgba(255,255,255,0.07)",
              color:       active ? acc.color         : "rgba(255,255,255,0.35)",
              boxShadow:   active ? `0 0 10px ${acc.color}30` : "none",
            }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: acc.color }} />
            {acc.accountName}
          </button>
        )
      })}
    </div>
  )
}
