"use client"

import { BookOpen, Image } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface JournalNotesProps {
  entriesThisMonth?: number
  screenshots?: number
}

export function JournalNotes({ entriesThisMonth = 0, screenshots = 0 }: JournalNotesProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" />
          Journal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Entries this month</span>
            <span className="text-sm font-medium">{entriesThisMonth}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Screenshots</span>
            </div>
            <span className="text-sm font-medium">{screenshots}</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-dashed border-border">
          <p className="text-xs text-muted-foreground text-center">
            Click any past date on the calendar to add notes and screenshots.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
