"use client"

import { BookOpen, ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SlimJournalProps {
  entriesThisMonth?: number
  screenshots?: number
}

export function SlimJournal({ entriesThisMonth = 0, screenshots = 0 }: SlimJournalProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4 text-primary" />
          Journal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Entries this month</span>
            <span className="font-medium">{entriesThisMonth}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Screenshots</span>
            </div>
            <span className="font-medium">{screenshots}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Click any past date on the calendar to add notes and screenshots.
        </p>
      </CardContent>
    </Card>
  )
}
