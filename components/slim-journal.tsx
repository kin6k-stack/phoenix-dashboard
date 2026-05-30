"use client"

import { BookOpen, ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SlimJournalProps {
  entriesThisMonth?: number
  screenshots?: number
}

export function SlimJournal({ entriesThisMonth = 0, screenshots = 0 }: SlimJournalProps) {
  return (
    <Card className="border-border/40 bg-card/60 shadow-lg gap-0 py-0">
      <CardHeader className="px-3 py-2 border-b border-border/30">
        <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          Journal
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center justify-between bg-background/50 rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Entries this month</span>
          <span className="text-xs font-black text-foreground tabular-nums">{entriesThisMonth}</span>
        </div>
        <div className="flex items-center justify-between bg-background/50 rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Screenshots</span>
          </div>
          <span className="text-xs font-black text-foreground tabular-nums">{screenshots}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 px-0.5 pt-0.5 leading-snug">
          Click any past date on the calendar to add notes and screenshots.
        </p>
      </CardContent>
    </Card>
  )
}
