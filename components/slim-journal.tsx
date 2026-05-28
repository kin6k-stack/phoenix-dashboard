"use client"

import { BookOpen, ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SlimJournalProps {
  entriesThisMonth?: number
  screenshots?: number
}

export function SlimJournal({ entriesThisMonth = 0, screenshots = 0 }: SlimJournalProps) {
  return (
    <Card className="border-slate-800 bg-[#070b12]/60">
      <CardHeader className="pb-2 bg-[#03050a] rounded-t-xl border-b border-slate-900">
        <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <BookOpen className="h-4 w-4 text-green-400" />
          Journal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Entries this month</span>
            <span className="text-sm font-black font-mono text-slate-200">{entriesThisMonth}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Screenshots</span>
            <span className="text-sm font-black font-mono text-slate-200">{screenshots}</span>
          </div>
        </div>
        <p className="mt-3 text-[9px] text-slate-600 font-mono leading-relaxed">
          Click any past date to add notes and screenshots.
        </p>
      </CardContent>
    </Card>
  )
}
