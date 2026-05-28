"use client"

import { BookOpen, ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SlimJournalProps {
  entriesThisMonth?: number
  screenshots?: number
}

export function SlimJournal({ entriesThisMonth = 0, screenshots = 0 }: SlimJournalProps) {
  return (
    <Card className="border-border/40 bg-card/60 shadow-lg">
      <CardHeader className="pb-2 border-b border-border/30">
        <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          Journal
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Entries this month</span>
          <span className="text-sm font-black text-foreground tabular-nums">{entriesThisMonth}</span>
        </div>
        <div className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Screenshots</span>
          </div>
          <span className="text-sm font-black text-foreground tabular-nums">{screenshots}</span>
        </div>
        <p className="text-[10px] text-muted-foreground px-1 pt-1">
          Click any past date on the calendar to add notes and screenshots.
        </p>
      </CardContent>
    </Card>
  )
}
