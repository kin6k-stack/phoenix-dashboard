"use client"

// AccountFilterBar — shown above P&L Calendar and Analytics
// Lets user filter trades by registered account or see all
//
// THEME FIX: replaced hardcoded white (rgba(255,255,255,...) / white) with
// theme tokens so account names are readable on light themes (Gold, inverted
// White) as well as dark. The per-account accent color (acc.color) is kept —
// those are user-chosen and read fine on any canvas.

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
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mr-1">
        Account
      </span>

      {/* All — uses theme tokens so the label is dark on light themes */}
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border
          ${selectedAccountId === null
            ? "bg-foreground/10 border-foreground/30 text-foreground"
            : "bg-foreground/[0.03] border-border text-muted-foreground hover:text-foreground"}`}>
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
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border
              ${active ? "" : "bg-foreground/[0.03] border-border text-muted-foreground hover:text-foreground"}`}
            style={
              active
                ? {
                    background:  `${acc.color}22`,
                    borderColor: `${acc.color}60`,
                    color:       acc.color,
                    boxShadow:   `0 0 10px ${acc.color}30`,
                  }
                : undefined
            }>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: acc.color }} />
            {acc.accountName}
          </button>
        )
      })}
    </div>
  )
}
